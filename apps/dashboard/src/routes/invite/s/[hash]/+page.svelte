<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import AuthUI from '$lib/components/AuthUI/index.svelte';
  import { currentOrg } from '$lib/utils/store/org';
  import { authClient } from '$lib/auth-client';
  import { setTheme } from '$lib/utils/functions/theme';
  import { addGroupMember } from '$lib/utils/services/courses';
  import type { CurrentOrg } from '$lib/utils/types/org.js';
  import { ROLE } from '$lib/utils/constants/roles';
  import { profile } from '$lib/utils/store/user';
  import {
    triggerSendEmail,
    NOTIFICATION_NAME
  } from '$lib/utils/services/notification/notification';
  import { snackbar } from '$lib/components/Snackbar/store.js';
  import { capturePosthogEvent } from '$lib/utils/services/posthog';
  import { page } from '$app/stores';

  export let data;

  let loading = false;

  let disableSubmit = false;
  let formRef: HTMLFormElement;

  async function handleSubmit() {
    loading = true;

    if (!$profile.id || !$profile.email) {
      console.log('Profile not found', $profile);
      return goto(`/signup?redirect=${$page.url?.pathname || ''}`);
    }

    // Call API to join course
    const res = await fetch('/api/course/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            courseId: data.id,
            roleId: ROLE.STUDENT
        })
    });
    const { data: memberData, error, teachers } = await res.json();

    if (error) {
        console.error('Error joining course', error);
        snackbar.error('snackbar.invite.failed_join');
        window.location.href = '/lms';
        return;
    }

    capturePosthogEvent('student_joined_course', {
      course_name: data.name,
      student_id: $profile.id,
      student_email: $profile.email
    });

    // Send email welcoming student to the course
    triggerSendEmail(NOTIFICATION_NAME.STUDENT_COURSE_WELCOME, {
      to: $profile.email,
      orgName: data.currentOrg?.name,
      courseName: data.name
    });

    // Send notification to all teacher(s)
    if (teachers && teachers.length) {
        Promise.all(
            teachers.map((email: string) =>
            triggerSendEmail(NOTIFICATION_NAME.TEACHER_STUDENT_JOINED, {
                to: email,
                courseName: data.name,
                studentName: $profile.fullname,
                studentEmail: $profile.email
            })
            )
        );
    }

    // go to lms
    return goto('/lms');
  }

  function setCurOrg(cOrg: CurrentOrg) {
    if (!cOrg) return;
    currentOrg.set(cOrg);
  }

  onMount(async () => {
    // check if user has session, if not redirect to sign up with redirect back to this page
    const session = await authClient.getSession();
    if (!session.data) {
      return goto(`/login?redirect=${$page.url?.pathname || ''}`);
    }

    setTheme(data.currentOrg?.theme || '');
  });

  $: setCurOrg(data.currentOrg as CurrentOrg);
</script>

<svelte:head>
  <title>Join {data.name} on ClassroomIO</title>
</svelte:head>

<AuthUI
  isLogin={false}
  {handleSubmit}
  isLoading={loading || !$profile.id}
  showOnlyContent={true}
  showLogo={true}
  bind:formRef
>
  <div class="mt-0 w-full">
    <h3 class="mb-4 mt-0 text-center text-lg font-medium dark:text-white">{data.name}</h3>
    <p class="text-center text-sm font-light dark:text-white">{data.description}</p>
  </div>

  <div class="my-4 flex w-full items-center justify-center">
    <PrimaryButton
      label="Join Course"
      type="submit"
      isDisabled={disableSubmit || loading}
      isLoading={loading || !$profile.id}
    />
  </div>
</AuthUI>
