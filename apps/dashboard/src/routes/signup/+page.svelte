<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AuthUI from '$lib/components/AuthUI/index.svelte';
  import TextField from '$lib/components/Form/TextField.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import SenjaEmbed from '$lib/components/Senja/Embed.svelte';
  import { SIGNUP_FIELDS } from '$lib/utils/constants/authentication';
  import { t } from '$lib/utils/functions/translations';
  import {
    authValidation,
    getConfirmPasswordError,
    getDisableSubmit
  } from '$lib/utils/functions/validator';
  import { capturePosthogEvent } from '$lib/utils/services/posthog';
  import { globalStore } from '$lib/utils/store/app';
  import { currentOrg } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import { authClient } from '$lib/auth-client';

  let fields = Object.assign({}, SIGNUP_FIELDS);
  let loading = false;
  let success = false;
  let errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};
  let submitError: string;
  let disableSubmit = false;
  let formRef: HTMLFormElement;

  let query = new URLSearchParams($page.url.search);
  let redirect = query.get('redirect');

  async function handleSubmit() {
    const validationRes = authValidation(fields);
    console.log('validationRes', validationRes);

    if (Object.keys(validationRes).length) {
      errors = Object.assign(errors, validationRes);
      return;
    }

    try {
      loading = true;

      const [regexUsernameMatch] = [...(fields.email?.matchAll(/(.*)@/g) || [])];
      const username = regexUsernameMatch[1] + `${new Date().getTime()}`;
      const fullname = regexUsernameMatch[1];

      const { data, error } = await authClient.signUp.email({
        email: fields.email,
        password: fields.password,
        name: fullname,
        username: username,
        fullname: fullname
      });
      console.log('data', data);

      if (error) throw error;

      const authUser = data?.user;
      if (!authUser) {
        throw 'Error creating user';
      }

      // Setting profile
      // @ts-ignore
      profile.set(authUser);

      capturePosthogEvent('user_signed_up', {
        distinct_id: authUser.id || '',
        email: authUser.email,
        username: username
      });

      if ($globalStore.isOrgSite) {
        // Join the organization
        const joinRes = await fetch('/api/org/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: $currentOrg.id,
            role_id: 3
          })
        });
        const { data: joinData } = await joinRes.json();

        if (joinData?.[0]?.id) {
          currentOrg.update(c => ({ ...c, memberId: joinData[0].id }));
        }

        capturePosthogEvent('student_signed_up', {
          distinct_id: authUser.id || '',
          email: authUser.email,
          username: username
        });
      }

      if (redirect) {
        goto(redirect);
      } else {
        goto('/login');
      }

      formRef?.reset();
      success = true;
      fields = Object.assign({}, SIGNUP_FIELDS);
    } catch (error: any) {
      submitError = error?.error_description || error?.message;
      loading = false;
    }
  }

  $: errors.confirmPassword = getConfirmPasswordError(fields);
  $: disableSubmit = getDisableSubmit(fields);
</script>

<svelte:head>
  <title>Join ClassroomIO</title>
</svelte:head>

<SenjaEmbed id="aa054658-1e15-4d00-8920-91f424326c4e" />

<AuthUI isLogin={false} {handleSubmit} isLoading={loading} bind:formRef>
  <div class="mt-4 w-full">
    <p class="mb-6 text-lg font-semibold dark:text-white">Create a free account</p>
    <!-- <TextField
      label="Full Name"
      bind:value={fields.name}
      type="text"
      autoFocus={true}
      placeholder="e.g Joke Silva"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={errors.name}
      isRequired
    /> -->
    <TextField
      label={$t('login.fields.email')}
      bind:value={fields.email}
      type="email"
      placeholder="you@domain.com"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={$t(errors.email ?? '')}
      isRequired
    />
    <TextField
      label={$t('login.fields.password')}
      bind:value={fields.password}
      type="password"
      placeholder="************"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={$t(errors.password ?? '')}
      helperMessage={$t('login.fields.password_helper_message')}
      isRequired
    />
    <TextField
      label={$t('login.fields.confirm_password')}
      bind:value={fields.confirmPassword}
      type="password"
      placeholder="************"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={loading}
      errorMessage={errors.confirmPassword}
      isRequired
    />
    {#if submitError}
      <p class="text-sm text-red-500">{submitError}</p>
    {/if}
  </div>

  <div class="my-4 flex w-full items-center justify-end">
    <PrimaryButton
      label={$t('login.create_account')}
      type="submit"
      className="sm:w-full w-full"
      isDisabled={disableSubmit || loading}
      isLoading={loading}
    />
  </div>
</AuthUI>
