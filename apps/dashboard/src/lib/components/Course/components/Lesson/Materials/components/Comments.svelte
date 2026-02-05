<script lang="ts">
  import Avatar from '$lib/components/Avatar/index.svelte';
  import { lesson } from '$lib/components/Course/components/Lesson/store/lessons';
  import { group } from '$lib/components/Course/store';
  import TextArea from '$lib/components/Form/TextArea.svelte';
  import DeleteModal from '$lib/components/Modal/DeleteModal.svelte';
  import { VARIANTS } from '$lib/components/PrimaryButton/constants';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import { snackbar } from '$lib/components/Snackbar/store';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { t } from '$lib/utils/functions/translations';
  import { profile } from '$lib/utils/store/user';
  import type { GroupPerson, LessonComment } from '$lib/utils/types';
  import { OverflowMenu, OverflowMenuItem } from 'carbon-components-svelte';
  import { onMount } from 'svelte';

  const PAGE_SIZE = 20;

  export let lessonId = '';

  let comment = '';
  let comments: LessonComment[] = [];
  let groupmember: GroupPerson | undefined;
  let isSaving: boolean = false;
  let isFetching = false;
  let openDeleteModal = false;
  let deleteCommentId: number | null = null;
  let editCommentId: number | null = null;

  interface FetchComments {
    id: number;
    comment: string;
    created_at: string;
    groupmember: {
      id: string;
      profile: {
        avatar_url: string;
        fullname: string;
      };
    };
  }

  async function handleSend() {
    if (!comment || !groupmember) {
      return;
    }

    isSaving = true;

    comments = [
      {
        id: 0,
        comment: comment,
        name: $t('course.navItem.lessons.comments.you'),
        avatar: $profile.avatar_url,
        commentAt: new Date(),
        groupmember_id: groupmember.id
      },
      ...comments
    ];
    pagination.count = comments.length;

    try {
      const res = await fetch('/api/courses/lesson/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: $lesson.id, groupmember_id: groupmember.id, comment })
      });

      const result = await res.json();
      isSaving = false;

      if (!res.ok || !result.success) {
        console.error('Error adding comment:', result);
        snackbar.error($t('course.navItem.lessons.comments.comment_error'));
        return;
      }

      // Refresh the first page of comments to get normalized data
      await fetchComments([{ id: groupmember.id, profile_id: $profile.id }]);
      comment = '';
    } catch (err) {
      isSaving = false;
      console.error('Error adding comment:', err);
      snackbar.error($t('course.navItem.lessons.comments.comment_error'));
    }
  }

  async function handleUpdate(commentItem: LessonComment) {
    if (!editCommentId || !commentItem.comment) {
      return;
    }

    try {
      const res = await fetch('/api/courses/lesson/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editCommentId, comment: commentItem.comment })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error('handleUpdate', result);
        snackbar.error($t('snackbar.something'));
      } else {
        snackbar.success($t('snackbar.success_update'));
      }
    } catch (err) {
      console.error('handleUpdate', err);
      snackbar.error($t('snackbar.something'));
    }

    editCommentId = null;
    pagination.count = comments.length;
  }

  async function handleDeleteComment() {
    if (!deleteCommentId) {
      return;
    }

    try {
      const res = await fetch(`/api/courses/lesson/comments?id=${deleteCommentId}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error('error', result);
        snackbar.error($t('snackbar.something'));
      } else {
        snackbar.success($t('snackbar.success_delete'));
      }

      comments = comments.filter((comment) => comment.id !== deleteCommentId);
      pagination.count = comments.length;

      deleteCommentId = null;
    } catch (err) {
      console.error('error', err);
      snackbar.error($t('snackbar.something'));
    }
  }



  let pagination = {
    hasMore: true,
    count: 0,
    page: 0
  };

  async function fetchComments(people: GroupPerson[]) {
    if (!pagination.hasMore) return;

    groupmember = people.find((person) => person.profile_id === $profile.id);

    if (!groupmember || !lessonId) return;

    isFetching = true;

    const page = pagination.page || 0;
    const pageSize = PAGE_SIZE;

    try {
      const res = await fetch(`/api/courses/lesson/comments?lessonId=${lessonId}&page=${page}&pageSize=${pageSize}`);
      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error('Error fetching comments', result);
        isFetching = false;
        return;
      }

      const data = result.data || [];
      const count = result.count || 0;

      const newComments = data.map((lessonComment) => {
        return {
          id: lessonComment.id,
          comment: lessonComment.comment,
          avatar: lessonComment.groupmember.profile.avatar_url,
          commentAt: lessonComment.created_at,
          groupmember_id: lessonComment.groupmember.id,
          name:
            lessonComment.groupmember.id === groupmember?.id
              ? $t('course.navItem.lessons.comments.you')
              : lessonComment.groupmember.profile.fullname
        };
      });

      comments = page === 0 ? newComments : [...comments, ...newComments];
      pagination.hasMore = page * pageSize + (data?.length || 0) < count;
      pagination.count = count ?? 0;
      isFetching = false;
    } catch (err) {
      console.error('error', err);
      isFetching = false;
    }
  }
    pagination.page++;

    isFetching = false;
  }

  onMount(async () => {
    fetchComments($group.people);
  });
</script>

<DeleteModal bind:open={openDeleteModal} onDelete={handleDeleteComment} />

<div class="mx-auto w-full max-w-[65ch]">
  <!-- <hr class="my-5" /> -->
  <div class="mb-5">
    <p class="text-xl font-bold capitalize">
      {$t('course.navItem.lessons.comments.title')} ({pagination.count})
    </p>
  </div>
  <div>
    <div class="flex h-full items-start gap-3">
      <Avatar
        src={$profile.avatar_url}
        name={$profile.fullname}
        width="w-8"
        height="h-8"
        className="mt-2"
      />
      <div class="h-full w-full">
        <TextArea
          label={$t('course.navItem.lessons.comments.text_area_title')}
          placeholder={$t('course.navItem.lessons.comments.placeholder')}
          bind:value={comment}
        />
      </div>
    </div>

    <div class="mt-2 flex flex-row-reverse">
      <PrimaryButton
        label={$t('course.navItem.lessons.comments.comment_btn')}
        onClick={handleSend}
        isDisabled={!comment}
        isLoading={isSaving}
      />
    </div>
  </div>

  <div class="my-10">
    {#each comments as commentItem}
      <div class="mt-2 flex items-start gap-3 pb-2">
        <Avatar src={commentItem.avatar} name={commentItem.name} width="w-8" height="h-8" />

        <div class="w-full rounded-md border px-4 pb-4 pt-2 dark:border-neutral-700">
          <div class="flex items-center justify-between gap-2">
            <p class="text-md font-bold dark:text-white">
              {commentItem.name}
              <span
                class="ml-1 text-xs font-normal text-gray-800 dark:text-white"
                title={commentItem.commentAt.toLocaleString()}
              >
                {calDateDiff(commentItem.commentAt)}
              </span>
            </p>

            {#if groupmember?.id === commentItem.groupmember_id}
              <OverflowMenu flipped>
                <OverflowMenuItem text="Edit" on:click={() => (editCommentId = commentItem.id)} />
                <OverflowMenuItem
                  danger
                  text="Delete"
                  on:click={() => {
                    deleteCommentId = commentItem.id;
                    openDeleteModal = true;
                  }}
                />
              </OverflowMenu>
            {/if}
          </div>

          {#if editCommentId === commentItem.id}
            <TextArea
              placeholder={$t('course.navItem.lessons.comments.placeholder')}
              bind:value={commentItem.comment}
            />
            <div class="mt-2 flex flex-row-reverse items-center gap-2">
              <PrimaryButton
                variant={VARIANTS.OUTLINED}
                label={$t('course.navItem.lessons.comments.cancel_btn')}
                onClick={() => (editCommentId = null)}
              />
              <PrimaryButton
                label={$t('course.navItem.lessons.comments.comment_btn')}
                onClick={() => handleUpdate(commentItem)}
                isDisabled={!commentItem.comment}
                isLoading={isSaving}
              />
            </div>
          {:else}
            <article class="prose max-w-[300px] sm:prose-sm dark:text-white">
              {commentItem.comment}
            </article>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if pagination.hasMore}
    <div class="mt-2 flex items-center justify-center">
      <PrimaryButton
        label={$t('course.navItem.lessons.comments.load_more_btn')}
        variant={VARIANTS.OUTLINED}
        onClick={() => fetchComments($group.people)}
        isLoading={isFetching}
      />
    </div>
  {/if}
</div>
