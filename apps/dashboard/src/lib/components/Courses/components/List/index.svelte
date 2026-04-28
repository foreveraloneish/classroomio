<script lang="ts">
  import {
    StructuredListRow,
    StructuredListCell,
    Tag,
    OverflowMenuItem,
    OverflowMenu
  } from 'carbon-components-svelte';
  import { isMobile } from '$lib/utils/store/useMobile';
  import { goto } from '$app/navigation';
  import { t } from '$lib/utils/functions/translations';
  import { copyCourseModal, deleteCourseModal } from '../../store';

  export let id = '';
  export let title = '';
  export let type = '';
  export let description = '';
  export let isPublished = false;
  export let totalLessons = 0;
  export let totalStudents = 0;

  function handleCloneCourse(e) {
    e.stopPropagation();
    $copyCourseModal.open = true;
    $copyCourseModal.id = id;
    $copyCourseModal.title = title;
    $copyCourseModal.description = description;
  }

  function handleShareCourse(e) {
    e.stopPropagation();
    goto(`/courses/${id}/settings#share`);
  }

  function handleInvite(e) {
    e.stopPropagation();
    goto(`/courses/${id}/people?add=true`);
  }

  function handleDeleteCourse(e) {
    e.stopPropagation();
    $deleteCourseModal.open = true;
    $deleteCourseModal.id = id;
    $deleteCourseModal.title = title;
  }
</script>

<StructuredListRow label for="row-{id}" on:click={() => goto(`/courses/${id}`)}>
  <StructuredListCell><p class="font-semibold">{title}</p></StructuredListCell>
  <StructuredListCell>
    <p class="line-clamp-2">{description}</p>
  </StructuredListCell>
  {#if !$isMobile}
    <StructuredListCell>{type}</StructuredListCell>
    <StructuredListCell>{totalLessons}</StructuredListCell>
    <StructuredListCell>{totalStudents}</StructuredListCell>
    <StructuredListCell>
      <Tag class="break-normal" type={isPublished ? 'green' : 'cool-gray'}>
        {#if isPublished}
          {$t('courses.course_card.published')}
        {:else}
          {$t('courses.course_card.unpublished')}
        {/if}
      </Tag>
    </StructuredListCell>
  {/if}
  <StructuredListCell>
    <OverflowMenu
      id="course-list"
      flipped
      on:click={(e) => {
        e.stopPropagation();
      }}
    >
      <OverflowMenuItem
        text={$t('courses.course_card.context_menu.clone')}
        on:click={handleCloneCourse}
      />
      <OverflowMenuItem
        text={$t('courses.course_card.context_menu.share')}
        on:click={handleShareCourse}
      />
      <OverflowMenuItem
        text={$t('courses.course_card.context_menu.invite')}
        on:click={handleInvite}
      />
      <OverflowMenuItem
        danger
        text={$t('courses.course_card.context_menu.delete')}
        on:click={handleDeleteCourse}
      />
    </OverflowMenu>
  </StructuredListCell>
</StructuredListRow>
