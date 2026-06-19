import { auth } from '$lib/auth';
import { prisma } from '@cio/database';
import { json } from '@sveltejs/kit';

function toJSON(data: any) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export async function GET({ request }) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    const orgMembers = await prisma.organizationMember.findMany({
        where: { profile_id: session.user.id },
        include: {
            organization: {
                include: {
                    plans: true
                }
            }
        },
        orderBy: { id: 'desc' }
    });

    // Map to structure expected by frontend
    // The frontend code expects an array of objects which contain organization info
    // But look at `getOrganizations` in `org/index.ts`:
    // It pushes to orgsArray: { ...(orgMember?.organization || {}), memberId: orgMember?.id, role_id: ..., shortName: ... }

    // So I should return the raw query result similar to supabase, or return the processed list.
    // If I return processed list, I need to update frontend heavily.
    // If I return "Supabase-like" structure, I need:
    // [{ id, profile_id, role_id, created_at, organization: { ... } }]

    const result = orgMembers.map(om => ({
        id: om.id,
        profile_id: om.profile_id,
        role_id: om.role_id,
        created_at: om.created_at,
        organization: {
            ...om.organization,
            organization_plan: om.organization.plans.map(p => ({
                plan_name: p.plan_name,
                is_active: p.is_active,
                provider: p.provider,
                subscriptionId: p.subscription_id,
                customerId: "" // Not stored?
            }))
        }
    }));

    return json({ data: toJSON(result), error: null });
}
