<script lang="ts">
  import Modal from '$lib/components/Modal/index.svelte';
  import TextField from '$lib/components/Form/TextField.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import { supabase } from '$lib/utils/functions/supabase';
  import { profile } from '$lib/utils/store/user';
  import { generateSitename } from '$lib/utils/functions/org';
  import { getOrganizations } from '$lib/utils/services/org';
  import { blockedSubdomain } from '$lib/utils/constants/app';
  import { newOrgModal } from '../store';
  import { snackbar } from '$lib/components/Snackbar/store';
  import { createOrgValidation } from '$lib/utils/functions/validator';
  import { goto } from '$app/navigation';
  import { t } from '$lib/utils/functions/translations';

  type Error = {
    orgName: string;
    siteName: string;
  };
  let loading = false;
  let orgName = '';
  let siteName = '';

  let errors: Error = {
    orgName: '',
    siteName: ''
  };

  function resetForm() {
    orgName = '';
    siteName = '';
    loading = false;

    errors = {
      orgName: '',
      siteName: ''
    };
  }

  async function createNewOrg() {
    errors = createOrgValidation({
      orgName,
      siteName
    }) as Error;

    if (Object.values(errors).length) {
      loading = false;
      return;
    }
    // Validate if domain is among our seculeded subdomains
    if (blockedSubdomain.includes(siteName || '')) {
      errors.siteName = 'Sitename already exists.';
      loading = false;
      return;
    }

    try {
      // Create organization
      const sessionRes = await fetch('/api/auth/session');
      // Use session cookie/auth header provided by browser; auth endpoints on server will validate.

      const createRes = await fetch('/api/org/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, siteName })
      });

      const created = await createRes.json();

      if (!createRes.ok || !created.data) {
        errors.siteName = 'Sitename already exists.';
        loading = false;
        return;
      }

      // Join created org as owner
      const joinRes = await fetch('/api/org/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: created.data[0].id, role_id: 1 })
      });

      const joinResult = await joinRes.json();

      if (!joinRes.ok || !joinResult.data) {
        errors.siteName = $t('add_org.error_organization');
        // Delete organization so it can be recreated.
        await fetch('/api/org/create', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteName })
        });
        loading = false;
        return;
      }

      snackbar.success();
      await getOrganizations($profile.id);
      goto(`/org/${siteName}`);
      $newOrgModal.open = false;
      resetForm();
    } catch (err) {
      console.error('Error creating org', err);
      errors.siteName = $t('add_org.error_organization');
      loading = false;
    }
  }

  $: siteName = generateSitename(orgName);
</script>

<Modal
  onClose={() => ($newOrgModal.open = false)}
  bind:open={$newOrgModal.open}
  width="w-96"
  modalHeading={$t('add_org.create_org')}
>
  <form on:submit|preventDefault={createNewOrg} class="px-2">
    <TextField
      label={$t('add_org.name')}
      bind:value={orgName}
      autoFocus={true}
      placeholder="e.g Pepsi Co"
      className="mb-4"
      isRequired={true}
      errorMessage={errors.orgName}
      autoComplete={false}
    />
    <!-- Org Site Name -->
    <TextField
      label={$t('add_org.org_sitename')}
      helperMessage={`https://${siteName || ''}.classroomio.com`}
      bind:value={siteName}
      name="sitename"
      type="text"
      placeholder="e.g edforall"
      className="mb-5 w-full"
      labelClassName="text-lg font-normal"
      errorMessage={errors.siteName}
      isRequired={true}
    />

    <div class="mt-5 flex items-center flex-row-reverse">
      <PrimaryButton
        className="px-6 py-3"
        label={$t('add_org.create')}
        type="submit"
        isLoading={loading}
      />
    </div>
  </form>
</Modal>
