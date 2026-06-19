import { redirect } from '@sveltejs/kit';
import { getCurrentOrg } from '$lib/utils/services/org';

export const load = async ({ params = { hash: '' } }) => {
  try {
    const courseHashData = atob(decodeURIComponent(params.hash));
    console.log('courseHashData', courseHashData);

    const { id, name, description, orgSiteName } = JSON.parse(courseHashData);

    if (!id || !name || !description || !orgSiteName) {
      throw 'Validation failed';
    }
    const currentOrg = await getCurrentOrg(orgSiteName, true);

    return {
      id,
      name,
      description,
      currentOrg
    };
  } catch (error) {
    console.error('Error decoding course invite params.hash', error);
    throw redirect(307, '/404');
  }
};
