import { currentOrg, currentOrgDomain } from '$lib/utils/store/org';
import { identifyPosthogUser, initPosthog } from '$lib/utils/services/posthog';
import { initSentry, setSentryUser } from '$lib/utils/services/sentry';
import { profile, user } from '$lib/utils/store/user';

import { ROLE } from '$lib/utils/constants/roles';
import { ROUTE } from '$lib/utils/constants/routes';
import { dev } from '$app/environment';
import { get } from 'svelte/store';
import { getOrganizations } from '$lib/utils/services/org';
import { goto } from '$app/navigation';
import { handleLocaleChange } from '$lib/utils/functions/translations';
import isEmpty from 'lodash/isEmpty';
import isPublicRoute from '$lib/utils/functions/routes/isPublicRoute';
import { page } from '$app/stores';
import { setTheme } from '$lib/utils/functions/theme';
import shouldRedirectOnAuth from '$lib/utils/functions/routes/shouldRedirectOnAuth';
import { authClient } from '$lib/auth-client';

export function setupAnalytics() {
  // Set up sentry
  initSentry();

  // Set up posthog
  initPosthog();

  // Disable umami on localhost
  if (dev) {
    localStorage.setItem('umami.disabled', '1');
  }
}

function setAnalyticsUser() {
  const profileStore = get(profile);

  if (!profileStore.id) return;

  setSentryUser({
    id: profileStore.id,
    username: profileStore.username,
    email: profileStore.email,
    fullname: profileStore.fullname
  });

  identifyPosthogUser(profileStore.id, {
    email: profileStore.email,
    name: profileStore.fullname
  });
}

export async function getProfile({
  path,
  queryParam,
  isOrgSite,
  orgSiteName
}: {
  path: string;
  queryParam: string;
  isOrgSite: boolean;
  orgSiteName: string;
}) {
  const pageStore = get(page);
  const profileStore = get(profile);
  const currentOrgStore = get(currentOrg);
  const currentOrgDomainStore = get(currentOrgDomain);

  const params = new URLSearchParams(window.location.search);
  // Get user profile
  const session = await authClient.getSession();
  const authUser = session.data?.user;
  console.log('Get user', authUser);

  if (!authUser && !isPublicRoute(pageStore.url?.pathname)) {
    return goto('/login?redirect=/' + path + queryParam);
  }

  if (authUser?.email?.endsWith('@test.com') && !dev) {
    // This is a test email, auto logout
    window.location.href = '/logout';
    return;
  }

  // Skip refetching profile, if already in store
  if (profileStore.id) {
    handleLocaleChange(profileStore.locale);
    return;
  }

  // Check if user has profile (fetch from API)
  const res = await fetch('/api/profile');
  const { data: profileData, error } = await res.json();
  console.log('Get profile', profileData);

  // If user is authenticated, profile (User) must exist.
  if (profileData) {
    // Profile exists, go to profile page
    user.update((_user) => ({
      ..._user,
      fetchingUser: false,
      isLoggedIn: true,
      currentSession: authUser
    }));

    // @ts-ignore
    profile.set(profileData);

    // Set user in sentry
    setAnalyticsUser();

    handleLocaleChange(profileData.locale);

    const orgRes = await getOrganizations(profileData.id, isOrgSite, orgSiteName);

    const isStudentAccount = orgRes.currentOrg.role_id == ROLE.STUDENT;

    // student redirect
    if (isOrgSite) {
      if (params.has('redirect')) {
        goto(params.get('redirect') || '');
      } else if (shouldRedirectOnAuth(path)) {
        goto('/lms');
      }
    } else {
      if (isStudentAccount) {
        // Check if the student logged into the dashboard.
        console.log('Student logged into dashboard');
        if (dev) {
          goto('/lms');
        } else {
          window.location.replace(`${currentOrgDomainStore}/lms`);
        }
      } else if (isEmpty(orgRes.orgs) && !path.includes('invite')) {
        // Not on invite page or no org, go to onboarding
        goto(ROUTE.ONBOARDING);
      } else if (params.has('redirect')) {
        goto(params.get('redirect') || '');
      } else if (shouldRedirectOnAuth(path)) {
        // By default redirect to first organization
        goto(`/org/${orgRes.currentOrg.siteName}`);
      }
    }

    setTheme(orgRes?.currentOrg?.theme);
  }

  if (!profileData && !isPublicRoute(pageStore.url?.pathname)) {
    goto('/login?redirect=/' + path);
  }
}
