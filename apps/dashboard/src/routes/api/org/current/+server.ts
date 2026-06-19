import { getCurrentOrgServer } from '$lib/utils/services/org/server';
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
    const siteName = url.searchParams.get('siteName');
    const isCustomDomain = url.searchParams.get('isCustomDomain') === 'true';

    if (!siteName) return json({ error: 'Missing siteName' }, { status: 400 });

    const org = await getCurrentOrgServer(siteName, isCustomDomain);

    // Return format matching Supabase response { data: [org], error: null }
    // because the client code expects data[0]
    return json({ data: org ? [org] : [], error: null });
}
