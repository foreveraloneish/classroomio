import { json } from '@sveltejs/kit';
import { prisma } from '@cio/database';

export async function GET({ url, request }) {
  // Simple auth check - in production this should be more robust
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return json(
      {
        success: false,
        error: 'Unauthorized'
      },
      { status: 401 }
    );
  }

  try {
    // Fetch verification tokens from Prisma Verification model
    // Note: Prisma `Verification` model maps to `verification` table (used by Better-Auth / NextAuth)
    const tokenStats = await prisma.verification.findMany({
      orderBy: { expiresAt: 'desc' },
      take: 100
    });

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // We don't have explicit created_at/used fields on `verification`, so infer some metrics
    const recent = tokenStats.filter((t) => t.expiresAt > last24Hours);
    const expired = tokenStats.filter((t) => t.expiresAt < now);

    return json({
      success: true,
      stats: {
        total_tokens: tokenStats.length,
        recent_24h: recent.length,
        used_tokens: 0, // Not tracked in current model
        expired_unused: expired.length,
        unique_creation_ips: 0,
        unique_usage_ips: 0,
        success_rate: tokenStats.length > 0 ? ((tokenStats.length - expired.length) / tokenStats.length * 100).toFixed(1) : 0
      },
      recent_activity: recent.slice(0, 10).map((t) => ({
        created_at: t.expiresAt ? new Date(t.expiresAt).toISOString() : null,
        email: (t.identifier || '').replace(/(.{2}).*@/, '$1***@'),
        used: false,
        expired: t.expiresAt ? new Date(t.expiresAt) < now : false,
        ip: null
      }))
    });
  } catch (error) {
    console.error('Security monitoring error:', error);
    return json(
      {
        success: false,
        error: 'Unexpected error'
      },
      { status: 500 }
    );
  }
}
