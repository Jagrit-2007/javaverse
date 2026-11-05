import { describe, it, expect } from 'vitest';
import {
  sendOwnerVerificationEmail,
  sendMemberInvitationEmail,
  sendPasswordResetEmail,
} from '@/lib/email';

describe('Mailpit SMTP & Fragment Handling Integration', () => {
  const MAILPIT_API = 'http://127.0.0.1:8025/api/v1';

  it('delivers invitation, verification, and reset emails to Mailpit with hash fragment tokens', async () => {
    // 1. Clear any prior test messages in Mailpit
    try {
      await fetch(`${MAILPIT_API}/messages`, { method: 'DELETE' });
    } catch {
      // If Mailpit is not reachable, fail clearly
    }

    const testEmail = 'learner.mailpit@example.com';
    const testToken = 'abc123xyz456secretfragmenttoken';

    // 2. Send emails
    await sendMemberInvitationEmail({
      email: testEmail,
      token: testToken,
      invitedByName: 'Test Admin',
    });

    await sendOwnerVerificationEmail({
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

    expect(messages.length).toBeGreaterThanOrEqual(3);

    // Verify recipient and subject lines
    const subjects = messages.map((m: { Subject: string }) => m.Subject);
    expect(subjects).toContain("You've been invited to join JavaVerse");
    expect(subjects).toContain('Verify your JavaVerse Owner email');
    expect(subjects).toContain('Reset your JavaVerse password');

    // Inspect individual message details to verify fragment tokens
    const inviteMessageSummary = messages.find((m: { Subject: string }) =>
      m.Subject.includes('invited'),
    );
    expect(inviteMessageSummary).toBeDefined();

    const inviteDetailRes = await fetch(`${MAILPIT_API}/message/${inviteMessageSummary.ID}`);
    expect(inviteDetailRes.ok).toBe(true);
    const inviteDetail = await inviteDetailRes.json();

    // Verify token is transmitted via URL fragment (#token=) to protect against server log leakage
    expect(inviteDetail.Text).toContain(`#token=${testToken}`);
    expect(inviteDetail.HTML).toContain(`#token=${testToken}`);
  });
});
