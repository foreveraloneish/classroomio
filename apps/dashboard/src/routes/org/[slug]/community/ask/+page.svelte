<script lang="ts">
  import { goto } from '$app/navigation';
  import { courses } from '$lib/components/Courses/store';
  import TextField from '$lib/components/Form/TextField.svelte';
  import { VARIANTS } from '$lib/components/PrimaryButton/constants';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import { snackbar } from '$lib/components/Snackbar/store';
  import TextEditor from '$lib/components/TextEditor/index.svelte';
  import generateSlug from '$lib/utils/functions/generateSlug';
  import { supabase } from '$lib/utils/functions/supabase';
  import { t } from '$lib/utils/functions/translations';
  import { askCommunityValidation } from '$lib/utils/functions/validator';
  import { fetchCourses } from '$lib/utils/services/courses';
  import { currentOrg, currentOrgPath } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import type { Course } from '$lib/utils/types';
  import { Dropdown } from 'carbon-components-svelte';
  import ArrowLeftIcon from 'carbon-icons-svelte/lib/ArrowLeft.svelte';

  let errors: {
    title?: string;
    courseId?: string;
    body?: string;
  } = {};
  let fields = {
    title: '',
    body: '',
    courseId: ''
  };

  let fetchedCourses: Course[] = [];

  async function getCourses(userId: string | null, orgId: string) {
    if ($courses.length) {
      fetchedCourses = [...$courses];
      return;
    }

    const coursesResults = await fetchCourses(userId, orgId);
    if (!coursesResults) return;

    fetchedCourses = coursesResults.allCourses;
  }

  async function handleSave() {
    errors = askCommunityValidation(fields);
    console.log('handleSave errors', errors);

    if (Object.keys(errors).length) {
      return;
    }

    try {
      const res = await fetch('/api/community/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: fields.title, body: fields.body, organization_id: $currentOrg.id, author_profile_id: $profile.id, votes: 0, slug: generateSlug(fields.title), course_id: fields.courseId })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error('Error: asking question', result);
        snackbar.error('snackbar.community.error.try_again');
      } else {
        const slug = result.data[0]?.slug;
        console.log('Success: asking question', result.data, slug);
        snackbar.success('snackbar.community.success.question_submitted');
        goto(`${$currentOrgPath}/community/${slug}`);
      }
    } catch (err) {
      console.error('Error: asking question', err);
      snackbar.error('snackbar.community.error.try_again');
    }
  }

  $: {
    if ($profile.id && $currentOrg.id) {
      getCourses($profile.id, $currentOrg.id);
    }
  }
</script>

<svelte:head>
  <title>Ask the Community - ClassroomIO</title>
</svelte:head>

<section class="w-full md:mx-auto md:max-w-3xl">
  <div class="p-5">
    <a
      class="text-md flex items-center text-gray-500 dark:text-white"
      href={`${$currentOrgPath}/community`}
    >
      <ArrowLeftIcon size={24} class="carbon-icon dark:text-white" />
      {$t('community.ask.go_back')}
    </a>
    <div class="flex items-center justify-between gap-12">
      <h1 class="text-2xl font-bold dark:text-white md:text-3xl">{$t('community.ask.ask_the')}</h1>
      <PrimaryButton
        label={$t('community.ask.publish')}
        variant={VARIANTS.CONTAINED_DARK}
        onClick={handleSave}
      />
    </div>
  </div>

  <div class="mb-3 flex justify-between gap-x-5 p-2">
    <TextField
      bind:value={fields.title}
      placeholder={$t('community.ask.title')}
      errorMessage={errors.title}
      className="w-[75%]"
    />
    <Dropdown
      class="h-full w-[25%]"
      size="xl"
      label={$t('community.ask.select_course')}
      invalid={!!errors.courseId}
      invalidText={errors.courseId}
      items={fetchedCourses.map((course) => ({ id: course.id, text: course.title }))}
      bind:selectedId={fields.courseId}
    />
  </div>
  <div class="px-2">
    <TextEditor
      bind:value={fields.body}
      placeholder={$t('community.ask.ask_community')}
      onChange={(html) => (fields.body = html)}
    />

    {#if errors.body}
      <p class="mt-2 text-sm text-red-500">{errors.body}</p>
    {/if}
  </div>
</section>
