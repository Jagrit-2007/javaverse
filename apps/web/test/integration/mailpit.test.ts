import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { deriveTokenDigest } from '@javaverse/security';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';
import { createCsrfToken } from '@/lib/csrf';
import { getServerKeys } from '@/lib/keys';
import { POST as handleVerifyEmail } from '@/app/api/v1/auth/email/verify/route';

describe('Mailpit SMTP & Fragment Handling Integration', () => {
  const MAILPIT_API = 'http://127.0.0.1:8025/api/v1';

  it('delivers verification and password reset emails to Mailpit with neutral language and hash fragment tokens', async () => {
    // 1. Clear any prior test messages in Mailpit
    try {
      await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' });
    } catch {
      // If Mailpit is not reachable, fail clearly
    }

    const testEmail = 'learner.mailpit@example.com';
    const testToken = 'abc123xyz456secretfragmenttoken';

    // 2. Send verification and password reset emails
    await sendVerificationEmail({
      email: testEmail,
      token: testToken,
    });

    await sendPasswordResetEmail({
      email: testEmail,
      token: testToken,
    });

    // 3. Inspect delivered messages in Mailpit via REST API
    const res = await fetch(`${MAILPIT_API}/messages`);
    expect(res.ok).toBe(true);

    const data = await res.json();
    const messages = data.messages || [];

    expect(messages.length).toBeGreaterThanOrEqual(2);

    // Verify recipient and subject lines
    const subjects = messages.map((m: { Subject: string }) => m.Subject);
    expect(subjects).toContain('Verify your JavaVerse email');
    expect(subjects).toContain('Reset your JavaVerse password');
    expect(subjects.some((s: string) => /owner|member|admin|invite|seat|tenant/i.test(s))).toBe(
      false,
    );

    // Inspect verification message details
    const verifySummary = messages.find((m: { Subject: string }) =>
      m.Subject.includes('Verify your JavaVerse email'),
    );
    expect(verifySummary).toBeDefined();

    const verifyDetailRes = await fetch(`${MAILPIT_API}/message/${verifySummary.ID}`);
    expect(verifyDetailRes.ok).toBe(true);
    const verifyDetail = await verifyDetailRes.json();

    // Verify token is transmitted via URL fragment (#token=) to protect against server log leakage
    expect(verifyDetail.Text).toContain(`#token=${testToken}`);
    expect(verifyDetail.HTML).toContain(`#token=${testToken}`);

    // Verify neutral body copy with no privileged-role or invitation terminology
    const verifyContent = `${verifyDetail.Text} ${verifyDetail.HTML}`.toLowerCase();
    expect(verifyContent).not.toMatch(/owner|administrator|workspace|invitation|seat|tenant/i);

    // Verify no password or password hash in email content
    expect(verifyContent).not.toMatch(/password_hash|\$argon2id\$/i);

    // Inspect password reset message details
    const resetSummary = messages.find((m: { Subject: string }) =>
      m.Subject.includes('Reset your JavaVerse password'),
    );
    expect(resetSummary).toBeDefined();

    const resetDetailRes = await fetch(`${MAILPIT_API}/message/${resetSummary.ID}`);
    expect(resetDetailRes.ok).toBe(true);
    const resetDetail = await resetDetailRes.json();

    expect(resetDetail.Text).toContain(`#token=${testToken}`);
    expect(resetDetail.HTML).toContain(`#token=${testToken}`);
  });

  it('confirms that the #token fragment is extracted by browser flow and safely verifies account without query string leaks', async () => {
    // 1. Create an unverified user and token in the test database
    const user = await prisma.user.create({
      data: {
        email: `verify.fragment.${Date.now()}@example.local`,
        displayName: 'Fragment Learner',
        status: 'ACTIVE',
        emailVerifiedAt: null,
      },
    });

    const rawToken = 'fragment_test_raw_token_' + Date.now();
    const keys = getServerKeys();
    const tokenHash = deriveTokenDigest(rawToken, 'email_verification', keys.authTokenHmacKey);

    await prisma.emailToken.create({
      data: {
        subjectUserId: user.id,
        purpose: 'VERIFY_EMAIL',
        deliveryChannel: 'EMAIL',
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // 2. Deliver email via Mailpit
    await sendVerificationEmail({
      email: user.email,
      token: rawToken,
    });

    // 3. Retrieve email from Mailpit and extract fragment
    const listRes = await fetch(`${MAILPIT_API}/messages`);
    const listData = await listRes.json();
    const latestMsg = listData.messages.find(
      (m: { To: Array<{ Address: string }> }) => m.To[0]?.Address === user.email,
    );
    expect(latestMsg).toBeDefined();

    const detailRes = await fetch(`${MAILPIT_API}/message/${latestMsg.ID}`);
    const detail = await detailRes.json();

    // Confirm token is strictly in hash fragment #token= and NOT in query string ?token=
    expect(detail.Text).toContain(`#token=${rawToken}`);
    expect(detail.Text).not.toContain(`?token=${rawToken}`);
    expect(detail.HTML).toContain(`#token=${rawToken}`);
    expect(detail.HTML).not.toContain(`?token=${rawToken}`);

    // Extract token using regex matching the browser client hash parser
    const fragmentMatch = detail.Text.match(/#token=([a-zA-Z0-9_-]+)/);
    expect(fragmentMatch).not.toBeNull();
    const extractedToken = fragmentMatch![1];
    expect(extractedToken).toBe(rawToken);

    // 4. Simulate browser POST submission to /api/v1/auth/email/verify
    const csrfToken = createCsrfToken({ flow: 'verify_email' });
    const verifyReq = new NextRequest('http://localhost:3000/api/v1/auth/email/verify', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify({ token: extractedToken }),
    });

    const verifyRes = await handleVerifyEmail(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.data.verified).toBe(true);

    // 5. Verify database user now has emailVerifiedAt set
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser?.emailVerifiedAt).not.toBeNull();

    // 6. Verify token is marked as used
    const updatedToken = await prisma.emailToken.findFirst({ where: { tokenHash } });
    expect(updatedToken?.usedAt).not.toBeNull();
  });
});
