import type { CurrentOrg, OrgTeamMember } from '$lib/utils/types/org';
import { ROLE, ROLE_LABEL } from '$lib/utils/constants/roles';
import { currentOrg, orgAudience, orgTeam, orgs } from '$lib/utils/store/org';

import type { OrganizationPlan } from '$lib/utils/types';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';

export async function getOrgTeam(orgId: string) {
  const response = await fetch(`/api/org/team?orgId=${orgId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      team: [],
      error: { message: error }
    };
  }

  const { success, team, message } = await response.json();

  if (!success) {
    return {
      team: [],
      error: { message }
    };
  }

  orgTeam.set(team);

  return {
    team: get(orgTeam),
    error: null
  };
}

export async function getOrganizations(userId: string, isOrgSite?: boolean, orgSiteName?: string) {
  const response = await fetch('/api/orgs');
  const { data, error } = await response.json();

  const orgsArray: CurrentOrg[] = [];

  if (Array.isArray(data) && data.length) {
    data.forEach((orgMember) => {
      orgsArray.push({
        ...(orgMember?.organization || {}),
        memberId: orgMember?.id,
        role_id: parseInt(orgMember?.role_id),
        shortName: orgMember?.organization?.name?.substring(0, 2)?.toUpperCase() || ''
      });
    });

    orgs.set(orgsArray);

    // If this is a student dashboard
    if (isOrgSite && orgSiteName) {
      const orgData = orgsArray.find((org) => org.siteName === orgSiteName);

      if (orgData) {
        currentOrg.set(orgData);
      }
    } else {
      // Check if org was last visited in localhost
      if (localStorage) {
        const lastOrgSiteName = localStorage.getItem('classroomio_org_sitename');

        const lastOrg = orgsArray.find((org) => org.siteName === lastOrgSiteName);

        if (lastOrg) {
          currentOrg.set(lastOrg);
        }
      }

      // Default to setting the first org in the array of orgs
      const _currentOrg = get(currentOrg);
      if (!_currentOrg.siteName) {
        currentOrg.set(orgsArray[0]);
      }
    }
  }

  return {
    orgs: orgsArray,
    currentOrg: get(currentOrg),
    error
  };
}

export async function getOrgAudience(orgId: string) {
  const response = await fetch(`/api/org/audience?orgId=${orgId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      audience: [],
      error: { message: error }
    };
  }

  const { audience, error } = await response.json();

  if (error) {
    return {
      audience: [],
      error
    };
  }

  orgAudience.set(audience);

  return {
    audience: audience,
    error: null
  };
}

export async function getCourseBySiteName(siteName: string) {
  const res = await fetch(`/api/courses/public?siteName=${siteName}`);
  const { data, error } = await res.json();

  if (error) {
    return [];
  }

  return data;
}

const CURRENT_ORG_QUERY = `
  id,
  name,
  siteName,
  avatar_url,
  landingpage,
  is_restricted,
  customization,
  theme,
  favicon,
  customDomain,
  isCustomDomainVerified,
  customCode,
  organization_plan(
    plan_name,
    is_active
  )
`;
export async function getCurrentOrg(siteName: string, justGet = false, isCustomDomain = false) {
  const res = await fetch(`/api/org/current?siteName=${siteName}&isCustomDomain=${isCustomDomain}`);
  const { data, error } = await res.json();

  const isDataEmpty = !data?.[0];

  if (!justGet && (error || isDataEmpty)) {
    console.error('Error getOrganization', error);
    return goto('/404');
  }

  if (!justGet) {
    if (isDataEmpty) return;

    currentOrg.set(data[0]);
  } else if (!isDataEmpty) {
    return data[0];
  }
}

export async function updateOrgPlan(params: {
  subscriptionId: string;
  data: OrganizationPlan['payload'];
}) {
  const res = await fetch('/api/org/plan', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return await res.json();
}

export async function createOrgPlan(params: {
  orgId: OrganizationPlan['org_id'];
  planName: OrganizationPlan['plan_name'];
  subscriptionId: OrganizationPlan['subscription_id'];
  triggeredBy: OrganizationPlan['triggered_by'];
  data: OrganizationPlan['payload'];
}) {
  const res = await fetch('/api/org/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return await res.json();
}

export async function cancelOrgPlan(params: {
  subscriptionId: string;
  data: OrganizationPlan['payload'];
}) {
  const res = await fetch('/api/org/plan/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return await res.json();
}
