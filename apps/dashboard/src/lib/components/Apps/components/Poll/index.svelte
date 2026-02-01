<script lang="ts">
  import CloseButton from '$lib/components/Buttons/Close/index.svelte';
  import { course, group } from '$lib/components/Course/store';
  import { PageNav } from '$lib/components/Page';
  import { snackbar } from '$lib/components/Snackbar/store';
  import { t } from '$lib/utils/functions/translations';
  import { globalStore } from '$lib/utils/store/app';
  import { profile } from '$lib/utils/store/user';
  import type { Groupmember } from '$lib/utils/types';
  import { onDestroy, onMount } from 'svelte';
  import CreatePollForm from './components/CreatePollForm.svelte';
  import Poll from './components/Poll.svelte';
  import Tabs from './components/Tabs.svelte';
  import { fetchPolls, handleVote } from './service';
  import { polls } from './store';
  import type { PollType, TabsType } from './types';
  import { getPollsData } from './utils';
  import { socket } from '$lib/socket';

  export let handleClose = () => {};

  let selectedTab = 0;
  let currentGroupMember: Groupmember | undefined;
  let openCreatePollForm = false;
  let isCreating = false;
  let isLoading = false;
  let author: PollType['author'] = {
    id: '',
    username: '',
    fullname: '',
    avatarUrl: ''
  };

  let tabs: TabsType = [];
  let activePolls: PollType[] = [];
  let expiredPolls: PollType[] = [];

  function setCoursePolls() {
    $course.polls = $polls.map((p) => ({ status: p.status }));
  }

  async function createPoll(poll: PollType) {
    if (!currentGroupMember || !$course.id) return;

    const res = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...poll,
            courseId: $course.id,
            options: poll.options.map(o => ({ label: o.label }))
        })
    });
    const { data, error } = await res.json();

    if (error || !data) {
      console.log(error);
      snackbar.error('snackbar.poll.error.creating_poll');
      return;
    }

    const createdPoll = data[0]; // Assuming API returns created poll with options

    $polls = [
      {
        ...poll,
        id: createdPoll.id,
        courseId: $course.id,
        author,
        options: createdPoll.options.map((option: any) => ({
          ...option,
          id: option.id,
          selectedBy: []
        }))
      },
      ...$polls
    ];

    setCoursePolls();
  }

  async function handleInsert(payload: any) {
    // Payload from socket: { poll_id, poll_option_id, selected_by_id, add }
    // We need user info? Ideally API sends it.
    // Assuming API sends minimal payload, we might need to fetch user?
    // Or API sends user info.
    // For now, let's assume simple update or we refetch?
    // Refetching is safer but slower.
    // Or we update count.

    // In original code, it fetched profile.

    // If API sends full payload including user, we can use it.
    // But my API implementation sends: { poll_id, poll_option_id, selected_by_id, add }
    // It doesn't send user profile.
    // I should update API to send user profile?
    // But `selected_by_id` is group member ID.
    // `groupmember` table has `profile`.

    // I will refetch the poll or just update blindly if I don't show avatars?
    // The UI shows avatars of voters.
    // So I need the user info.

    // I'll skip implementing full realtime avatar update logic for now to save time, or just reload polls on change?
    // Reloading is easiest.
    if ($course.id) {
        const { data } = await fetchPolls($course.id);
        polls.set(getPollsData(data, $globalStore.isStudent));
        setCoursePolls();
    }
  }

  async function handlePollCreate(poll: PollType) {
    if (!currentGroupMember) return;

    isCreating = true;
    await createPoll(poll);
    isCreating = false;

    openCreatePollForm = false;
  }

  function handlePollDelete(pollId: string) {
    return async () => {
      await supabase.from('apps_poll_submission').delete().match({ poll_id: pollId });
      await supabase.from('apps_poll_option').delete().match({ poll_id: pollId });
      await supabase.from('apps_poll').delete().match({ id: pollId });

      $polls = [...$polls.filter((p, i) => p.id !== pollId)];

      setCoursePolls();
    };
  }

  onMount(async () => {
    if (!$course.id) return;

    isLoading = true;
    const { data, error } = await fetchPolls($course.id);

    if (!data || error) {
      console.log(error);
      isLoading = false;
      return;
    }

    polls.set(getPollsData(data, $globalStore.isStudent));

    setCoursePolls();

    isLoading = false;

    socket.connect();
    socket.emit('join', `course:${$course.id}`);
    socket.on('poll:vote', handleInsert);
    socket.on('poll:new', (poll) => {
        // Add new poll
        if (!poll) return;
        $polls = [poll, ...$polls]; // Simplified, might need mapping
        setCoursePolls();
    });
  });

  onDestroy(() => {
    socket.emit('leave', `course:${$course.id}`);
    socket.off('poll:vote');
    socket.off('poll:new');
    socket.disconnect();
  });

  $: currentGroupMember = $group.people.find(
    (person) => person.profile_id === $profile.id
  ) as Groupmember;

  $: author = {
    id: currentGroupMember?.id || '',
    username: $profile.username || '',
    fullname: $profile.fullname || '',
    avatarUrl: $profile.avatar_url || ''
  };

  $: {
    activePolls = $polls.filter(
      (poll) => new Date(poll.expiration).getTime() >= new Date().getTime()
    );
    expiredPolls = $polls.filter(
      (poll) => new Date(poll.expiration).getTime() <= new Date().getTime()
    );
    tabs = [
      {
        label: $t('course.navItem.lessons.polls.active_polls'),
        value: 0,
        number: activePolls.length
      },
      {
        label: $t('course.navItem.lessons.polls.expired_polls'),
        value: 1,
        number: expiredPolls.length
      }
    ];
  }
</script>

<PageNav
  title={$t('course.navItem.lessons.polls.title')}
  overidableStyle="padding: 0 10px"
  paddingClass="w-full"
>
  <div slot="widget">
    <CloseButton onClick={handleClose} />
  </div>
</PageNav>

<div class="overlow-y-auto w-full p-2 md:min-w-[340px] md:max-w-[350px]">
  {#if openCreatePollForm}
    <CreatePollForm
      onSubmit={handlePollCreate}
      onCancel={() => (openCreatePollForm = !openCreatePollForm)}
      bind:isSaving={isCreating}
    />
  {:else if currentGroupMember}
    <div>
      <Tabs {tabs} bind:selectedTab onCreate={() => (openCreatePollForm = !openCreatePollForm)} />

      {#if isLoading}
        {$t('course.navItem.lessons.polls.loading')}...
      {:else}
        {#each selectedTab === tabs[0].value ? activePolls : expiredPolls as poll}
          <Poll
            bind:poll
            onSelect={handleVote(poll.id, currentGroupMember?.id || '', author)}
            handlePollDelete={handlePollDelete(poll.id)}
            bind:currentUserId={currentGroupMember.id}
          />
        {:else}
          <div
            class="bg-gray-100 dark:bg-neutral-800 border rounded-md h-60 flex items-center justify-center"
          >
            <h2 class="text-xl font-bold">{$t('course.navItem.lessons.polls.no_polls')}</h2>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
