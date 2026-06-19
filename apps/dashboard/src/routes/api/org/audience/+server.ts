import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export const GET: RequestHandler = async ({ request, url }) => {
  const userId = request.headers.get('user_id');
  const orgId = url.searchParams.get('orgId');

  if (!orgId) {
    return json({ success: false, message: 'Organization ID is required' }, { status: 400 });
  }

  if (!userId) {
    return json({ success: false, message: 'User ID is required' }, { status: 401 });
  }

  try {
    // Check if user has access to this organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { organization_id: orgId, profile_id: userId, role_id: { in: [1, 2] } }
    });

    if (!orgMember) {
      return json(
        {
          success: false,
          message: 'Access denied. User is not a member of this organization.'
        },
        { status: 403 }
      );
    }

    // Get all students who are participants in any course belonging to an org
    const students = await prisma.groupMember.findMany({
      where: {
        role_id: 3,
        group: { organization_id: orgId }
      },
      include: { user: true }
    });

    const audience = students.map((m) => ({
      id: m.user?.id || m.profile_id,
      name: m.user?.fullname || '',
      email: m.user?.email || m.email || '',
      avatar_url: m.user?.avatar_url || '',
      date_joined: m.user?.createdAt ? new Date(m.user?.createdAt).toDateString() : ''
    }));

    return json({
      success: true,
      audience
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return json(
      {
        success: false,
        message
      },
      { status: 500 }
    );
  }
};
