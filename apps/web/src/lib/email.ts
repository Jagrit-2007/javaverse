import nodemailer from 'nodemailer';
import { env } from '../env';

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;
let transporter: MailTransporter | null = null;

export function getEmailTransporter(): MailTransporter {
  if (!transporter) {
    const isSecure = env.SMTP_SECURE;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: isSecure,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASSWORD,
            }
          : undefined,
    });
  }
  return transporter;
}

export async function sendVerificationEmail(params: {
  email: string;
  token: string;
}): Promise<void> {
  const verifyUrl = `${env.APP_URL}/auth/verify-email#token=${encodeURIComponent(params.token)}`;
  const transport = getEmailTransporter();

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: 'Verify your JavaVerse email',
    text: `Welcome to JavaVerse!

Please verify your email address to complete your account setup:
${verifyUrl}

This link is valid for 24 hours.

If you did not request this, you can safely ignore this email.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Verify Email</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2>Verify your JavaVerse email</h2>
    <p>Welcome to JavaVerse! Please verify your email address to complete your account setup.</p>
    <p style="margin: 24px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #0d6efd; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Verify Email Address
      </a>
    </p>
    <p style="font-size: 14px; color: #666;">This link is valid for 24 hours.</p>
    <p style="font-size: 13px; color: #888; margin-top: 32px;">If you did not request this, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  token: string;
}): Promise<void> {
  const resetUrl = `${env.APP_URL}/auth/reset-password#token=${encodeURIComponent(params.token)}`;
  const transport = getEmailTransporter();

  await transport.sendMail({
    from: env.SMTP_FROM,
    to: params.email,
    subject: 'Reset your JavaVerse password',
    text: `We received a request to reset your password for JavaVerse.

Reset your password using the link below:
${resetUrl}

This link is valid for 1 hour.

If you did not request a password reset, please ignore this email or review your account security.`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Reset Password</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2>Reset your JavaVerse password</h2>
    <p>We received a request to reset your password. You can choose a new password by clicking below:</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #0d6efd; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        Reset Password
      </a>
    </p>
    <p style="font-size: 14px; color: #666;">This link is valid for 1 hour.</p>
    <p style="font-size: 13px; color: #888; margin-top: 32px;">If you did not request this change, you can safely ignore this email.</p>
  </div>
</body>
</html>`,
  });
}
