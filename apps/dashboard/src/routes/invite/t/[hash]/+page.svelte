<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AuthUI from '$lib/components/AuthUI/index.svelte';
  import type { Profile } from '$lib/components/Course/components/People/types';
  import TextField from '$lib/components/Form/TextField.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton/index.svelte';
  import { VARIANTS } from '$lib/components/PrimaryButton/constants';
  import { SIGNUP_FIELDS } from '$lib/utils/constants/authentication';
  import { logout } from '$lib/utils/functions/logout';
  import { setTheme } from '$lib/utils/functions/theme';
  import { authClient } from '$lib/auth-client';
  import { t } from '$lib/utils/functions/translations';
  import { profile, user } from '$lib/utils/store/user';
  import {
    authValidation,
    getConfirmPasswordError,
    getDisableSubmit
  } from '$lib/utils/functions/validator';
  import { currentOrg, currentOrgPath } from '$lib/utils/store/org';
  import type { CurrentOrg } from '$lib/utils/types/org';
  import { onMount } from 'svelte';
  import { snackbar } from '$lib/components/Snackbar/store.js';

  export let data;

  let fields = Object.assign({}, SIGNUP_FIELDS);
  let loading = false;
  let isLoggingOut = false;
  let shouldLogout = false;

  let errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = {};

  let submitError: string;
  let disableSubmit = false;
  let formRef: HTMLFormElement;

  async function joinOrg(profileId: string, email: string) {
    if (!profileId || !email || !data.invite.currentOrg?.id) return;

    // Update member response via API
    const res = await fetch('/api/org/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            organization_id: data.invite.currentOrg?.id
        })
    });
    const { error } = await res.json();

    if (error) {
        console.error('Error joining org', error);
        snackbar.error(error.message || 'Error joining organization');
        return;
    }

    formRef?.reset();

    window.location.href = $currentOrgPath;
  }

  async function signUserIn(profileId: string, email: string) {
    if (!profileId || !email) {
      throw $t('login.validation.unable_to_create_profile');
    }

    const { error } = await authClient.signIn.email({
        email,
        password: fields.password
    });

    if (error) {
      throw error;
    }
  }

  async function handleSubmit() {
    if ($profile && $profile.id) {
      loading = true;
      await joinOrg($profile.id, $profile.email);
      return;
    }

    const validationRes = authValidation({
      ...fields,
      email: data.invite.email // validation for this ema
    });
    console.log('validationRes', validationRes);

    if (Object.keys(validationRes).length) {
      errors = Object.assign(errors, validationRes);
      return;
    }

    try {
      loading = true;
      let profile: Profile | null = data.invite.profile;

      if (!data.invite.profile) {
        // Signup
        const username = fields.name.toLowerCase().replace(' ', '-') + new Date().getTime();
        const { data: signupData, error } = await authClient.signUp.email({
            email: data.invite.email,
            password: fields.password,
            name: fields.name,
            username,
            fullname: fields.name
        });

        if (error) throw error;

        if (!signupData?.user) {
          throw $t('login.validation.user_cannot_be_created');
        }

        // Profile is automatically created by Better-Auth mapping in schema
        // Or we can manually update profile if needed via API

        // Use the returned user as profile
        // @ts-ignore
        profile = signupData.user;
      }

      if (!profile?.id) {
        throw $t('login.validation.unable_to_create_profile');
      }

      await signUserIn(profile.id, profile.email);

      await joinOrg(profile.id, profile.email);
    } catch (error) {
      if (error instanceof Error) {
        submitError = error.message;
      } else {
        submitError = error?.toString() || '';
      }
    } finally {
      loading = false;
    }
  }

  function setCurOrg(cOrg: CurrentOrg) {
    if (!cOrg) return;

    console.log(cOrg);
    currentOrg.set(cOrg);
  }

  onMount(async () => {
    setTheme(data.invite.currentOrg?.theme || '');

    setCurOrg(data.invite.currentOrg as CurrentOrg);
  });

  $: errors.confirmPassword = getConfirmPasswordError(fields);
  $: disableSubmit = getDisableSubmit(fields);

  $: autoLogout($profile?.email);
  function autoLogout(email?: string) {
    if (!email) return;

    if (email !== data.invite.email) {
      console.log('logout');
      snackbar.error('You are logged in with a different email');
      shouldLogout = true;
    }
  }

  $: isLoading = loading || $user.fetchingUser;
  $: console.log('$profile', $profile);
  $: console.log('data.invite', data.invite);
</script>

<svelte:head>
  <title>Join ClassroomIO</title>
</svelte:head>

<AuthUI
  redirectPathname={$page.url.pathname}
  isLogin={false}
  {handleSubmit}
  {isLoading}
  showLogo={true}
  bind:formRef
>
  <div class="mt-4 w-full {shouldLogout ? 'hidden' : ''}">
    <p class="mb-6 text-lg font-semibold dark:text-white">
      {#if data.invite.profile}
        {$t('login.login_to_join')}
      {:else}
        {$t('login.create_to_join')}
      {/if}
    </p>
    <TextField
      label={$t('login.fields.email')}
      value={data.invite.email}
      type="email"
      placeholder="you@domain.com"
      className="mb-6"
      inputClassName="w-full"
      isDisabled={true}
    />
    {#if $profile?.email !== data.invite.email}
      {#if !data.invite.profile}
        <TextField
          label={$t('login.fields.full_name')}
          bind:value={fields.name}
          type="text"
          autoFocus={true}
          placeholder="e.g Joke Silva"
          className="mb-6"
          inputClassName="w-full"
          isDisabled={isLoading}
          errorMessage={errors.name}
          isRequired
        />
      {/if}
      <TextField
        label={$t('login.fields.password')}
        bind:value={fields.password}
        type="password"
        placeholder="************"
        className="mb-6"
        inputClassName="w-full"
        isDisabled={isLoading}
        errorMessage={errors.password}
        helperMessage={$t('login.fields.password_helper_message')}
        isRequired
      />
      {#if !data.invite.profile}
        <TextField
          label={$t('login.fields.confirm_password')}
          bind:value={fields.confirmPassword}
          type="password"
          placeholder="************"
          className="mb-6"
          inputClassName="w-full"
          isDisabled={isLoading}
          errorMessage={errors.confirmPassword}
          isRequired
        />
      {/if}
    {/if}
    {#if submitError}
      <p class="text-sm text-red-500">{submitError}</p>
    {/if}
  </div>

  <div class="my-4 flex w-full items-center justify-end">
    {#if shouldLogout}
      <PrimaryButton
        label="Logout"
        type="button"
        className="sm:w-full w-full"
        isLoading={isLoggingOut}
        variant={VARIANTS.CONTAINED_DANGER}
        onClick={async () => {
          isLoggingOut = true;

          await logout(false);

          isLoggingOut = false;
          shouldLogout = false;
        }}
      />
    {:else}
      <PrimaryButton
        label="Accept Invite"
        type="submit"
        className="sm:w-full w-full"
        isDisabled={disableSubmit}
        {isLoading}
      />
    {/if}
  </div>
</AuthUI>
