import { prisma } from '@cio/database';

export async function getCurrentOrgServer(siteName: string, isCustomDomain = false) {
  const where: any = {};
  if (isCustomDomain) {
    where.customDomain = siteName;
    where.isCustomDomainVerified = true;
  } else {
    where.siteName = siteName;
  }

  const org = await prisma.organization.findFirst({
    where,
    select: {
      id: true,
      name: true,
      siteName: true,
      avatar_url: true,
      landingpage: true,
      is_restricted: true,
      customization: true,
      theme: true,
      favicon: true,
      customDomain: true,
      isCustomDomainVerified: true,
      customCode: true,
      plans: {
        select: {
            plan_name: true,
            is_active: true,
            provider: true,
            subscription_id: true,
            // customerId? Not in schema.prisma yet?
        }
      }
    }
  });

  if (!org) return null;

  // Map to expected structure and handle serialization
  const result = {
    ...org,
    organization_plan: org.plans.map(p => ({
        ...p,
        subscriptionId: p.subscription_id,
        customerId: "" // Placeholder if needed
    }))
  };
  delete (result as any).plans;

  return JSON.parse(JSON.stringify(result, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}
