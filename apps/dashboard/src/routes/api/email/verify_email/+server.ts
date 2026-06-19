import { json } from '@sveltejs/kit';
import sendEmail from '$mail/sendEmail';
import { prisma } from '@cio/database';
import crypto from 'crypto';

export async function POST({ fetch, request }) {
  const { to, profileId, fullname } = await request.json();
  console.log('/POST api/email/verify_email', to, profileId);

  if (!to || !profileId) {
    return json(
      { success: false, message: 'Email and Profile ID are required fields' },
      { status: 400 }
    );
  }

  const profile = await prisma.user.findUnique({ where: { id: profileId } });

  if (!profile) {
    console.error('Profile verification failed: profile not found');
    return json({ success: false, message: 'Invalid profile' }, { status: 403 });
  }

  if (profile.email !== to) {
    console.error('Email mismatch:', { profileEmail: profile.email, requestedEmail: to });
    return json({ success: false, message: 'Email mismatch' }, { status: 403 });
  }

  // Get client IP for audit trail
  const clientIP =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Generate secure verification token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  try {
    await prisma.verification.create({
      data: {
        id: token,
        identifier: profileId,
        value: token,
        expiresAt: expiresAt
      }
    });
  } catch (err) {
    console.error('Token generation failed:', err);
    return json({ success: false, message: 'Failed to generate verification token' }, { status: 500 });
  }

  const origin = request.headers.get('origin');
  const verificationLink = `${origin}/api/verify?token=${encodeURIComponent(token)}`;

  const emailData = [
    {
      from: `"Best from ClassroomIO" <notify@mail.classroomio.com>`,
      to,
      subject: 'Action Required: Confirm your email',
      content: `
  <p><strong>Hi ${fullname} 👋</strong></p>
  <p>Welcome to ClassroomIO, new friend! In order to get your account ready for usage, we need to verify your email address. </p>
  <p>We do this to ensure the security of your account and prevent unauthorized access. To complete your registration, please click the <strong>Verify</strong> button below:</p>
  <div>
  <a class="button" href="${verificationLink}">Verify Email Address</a>
  </div>
  <p><strong>Security Notice:</strong></p>
  <ul>
    <li>This verification link will expire in 1 hour</li>
    <li>This link can only be used once</li>
    <li>If you didn't request this verification, please ignore this email</li>
  </ul>
  <p>If you're having trouble clicking the button, copy and paste the following link into your browser:</p>
  <p style="word-break: break-all;">${verificationLink}</p>
  `
    }
  ];

  try {
    await sendEmail(fetch)(emailData);
    console.log('Verification email sent successfully to:', to);
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    return json(
      {
        success: false,
        message: 'Failed to send verification email'
      },
      { status: 500 }
    );
  }

  return json({
    success: true,
    message: 'Verification email sent successfully',
    expiresAt
  });
}
