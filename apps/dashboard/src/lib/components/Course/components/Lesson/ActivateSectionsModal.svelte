<script lang="ts">
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import Modal from '$lib/components/Modal/index.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { VARIANTS } from '$lib/components/PrimaryButton/constants';
  import { getAccessToken } from '$lib/utils/functions/auth-client';
  import { course } from '../../store';
  import { snackbar } from '$lib/components/Snackbar/store';

  export let open = false;

  let isActivating = false;

  const activate = async () => {
    isActivating = true;

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/courses/convert-to-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token || '' },
        body: JSON.stringify({ course_id: $course.id })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        snackbar.error('snackbar.something');
        isActivating = false;
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error('Error converting course', err);
      snackbar.error('snackbar.something');
      isActivating = false;
    }
  };

  function handleClose() {
    open = false;
  }
</script>

<Modal
  onClose={handleClose}
  bind:open
  width="w-[80%] md:w-[65%]"
  maxWidth="max-w-xl"
  modalHeading={$t(`course.navItem.lessons.section_prompt.header`)}
>
  <div class="flex flex-col w-full items-center">
    <div class="mb-8">
      <h3 class="text-center text-2xl">
        {$t('course.navItem.lessons.section_prompt.title')}
      </h3>
      <p class="text-center max-w-md">
        {$t('course.navItem.lessons.section_prompt.description')}
      </p>
    </div>

    <div class="flex gap-2">
      <PrimaryButton
        variant={VARIANTS.OUTLINED}
        label={$t('course.navItem.lessons.section_prompt.cancel')}
        onClick={handleClose}
      />
      <PrimaryButton
        label={$t('course.navItem.lessons.section_prompt.activate')}
        onClick={activate}
        isLoading={isActivating}
      />
    </div>
  </div>
</Modal>
