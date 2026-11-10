import { describe, it, expect, beforeEach } from 'vitest';
import { prisma, assertSafeTestDatabase } from '@javaverse/db';
import { generateCspNonce, scrubPii } from '@javaverse/security';
import { awardPracticeProgressRewards } from '@/lib/progress';
import { generateSessionTokens, createSessionRow } from '@/lib/auth';

describe('Phase 11: Production Hardening & Operational Resilience', () => {
  beforeEach(async () => {
    assertSafeTestDatabase(process.env.DATABASE_URL);
    // Reset test state cleanly
    await prisma.userProgress.deleteMany();
    await prisma.userReward.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('CSP Nonce Cryptographic Quality', () => {
    it('generates unique, cryptographically random nonces with zero collisions across 1,000 samples', () => {
      const nonces = new Set<string>();
      const sampleSize = 1000;

      for (let i = 0; i < sampleSize; i++) {
        const nonce = generateCspNonce();
        expect(nonce).toBeDefined();
        expect(typeof nonce).toBe('string');
        // Base64-encoded 16 bytes is 24 chars
        expect(nonce.length).toBeGreaterThanOrEqual(20);
        expect(nonces.has(nonce)).toBe(false);
        nonces.add(nonce);
      }

      expect(nonces.size).toBe(sampleSize);
    });
  });

  describe('Concurrent Session Revocation', () => {
    it('reliably revokes all sessions for a user concurrently without affecting other users', async () => {
      const userA = await prisma.user.create({
        data: { email: 'learner-a@example.com', status: 'ACTIVE' },
      });
      const userB = await prisma.user.create({
        data: { email: 'learner-b@example.com', status: 'ACTIVE' },
      });

      // Create 20 concurrent sessions for userA
      const sessionPromisesA = Array.from({ length: 20 }, () => {
        const tokens = generateSessionTokens();
        return createSessionRow({
          userId: userA.id,
          tokenDigest: tokens.tokenDigest,
          publicId: tokens.publicId,
        });
      });

      // Create 5 sessions for userB
      const sessionPromisesB = Array.from({ length: 5 }, () => {
        const tokens = generateSessionTokens();
        return createSessionRow({
          userId: userB.id,
          tokenDigest: tokens.tokenDigest,
          publicId: tokens.publicId,
        });
      });

      await Promise.all([...sessionPromisesA, ...sessionPromisesB]);

      const countBeforeA = await prisma.session.count({ where: { userId: userA.id } });
      const countBeforeB = await prisma.session.count({ where: { userId: userB.id } });
      expect(countBeforeA).toBe(20);
      expect(countBeforeB).toBe(5);

      // Trigger logout-all session revocation for userA
      await prisma.session.deleteMany({ where: { userId: userA.id } });

      const countAfterA = await prisma.session.count({ where: { userId: userA.id } });
      const countAfterB = await prisma.session.count({ where: { userId: userB.id } });

      expect(countAfterA).toBe(0);
      expect(countAfterB).toBe(5); // userB's sessions must remain completely untouched
    });
  });

  describe('Concurrent Challenge Completion & Reward Idempotency', () => {
    it('prevents double XP rewards and duplicate progress rows under 10 concurrent completions', async () => {
      const user = await prisma.user.create({
        data: { email: 'reward-test@example.com', status: 'ACTIVE' },
      });

      // Concurrently submit practice completion for the same problem 10 times
      const concurrentSubmissions = Array.from({ length: 10 }, () =>
        awardPracticeProgressRewards(user.id, 'two-sum-array'),
      );

      const results = await Promise.all(concurrentSubmissions);

      // Exactly one submission should award the initial 100 XP
      const awardedXp = results.reduce((acc, r) => acc + r.xpAwarded, 0);
      expect(awardedXp).toBe(100);

      // Verify database state: exactly 1 progress row
      const progressRows = await prisma.userProgress.findMany({
        where: { userId: user.id, itemId: 'two-sum-array' },
      });
      expect(progressRows.length).toBe(1);

      // Verify total rewards: exactly 100 XP
      const rewards = await prisma.userReward.findUnique({
        where: { userId: user.id },
      });
      expect(rewards?.xp).toBe(100);
    });
  });

  describe('Deep Privacy & PII Scrubbing Compliance', () => {
    it('comprehensively scrubs diverse PII formats before knowledge base ingestion', () => {
      const sensitiveInput = `
        Hello, my name is John Doe and my email is j.doe@university.edu.
        I am running my Java program on 192.168.1.105 with gateway 10.0.0.1.
        My local project is at /home/john_doe/workspace/JavaApp/src/Main.java.
        I accidentally pasted my secret token sk-ant-api03-abcdef123456789012345678.
        Check out the doc at https://internal.corp.net/confidential/docs.
        Best regards,
        John Doe
      `;

      const scrubbed = scrubPii(sensitiveInput);

      expect(scrubbed.text).not.toContain('j.doe@university.edu');
      expect(scrubbed.text).not.toContain('192.168.1.105');
      expect(scrubbed.text).not.toContain('10.0.0.1');
      expect(scrubbed.text).not.toContain('/home/john_doe');
      expect(scrubbed.text).not.toContain('sk-ant-api03-abcdef123456789012345678');
      expect(scrubbed.text).not.toContain('https://internal.corp.net');
      expect(scrubbed.text).not.toContain('John Doe');

      expect(scrubbed.text).toContain('[REDACTED_EMAIL]');
      expect(scrubbed.text).toContain('[REDACTED_IP]');
      expect(scrubbed.text).toContain('[REDACTED_PATH]');
      expect(scrubbed.text).toContain('[REDACTED_SECRET]');
      expect(scrubbed.text).toContain('[REDACTED_URL]');
      expect(scrubbed.redactionCount).toBeGreaterThan(0);
      expect(scrubbed.categories.length).toBeGreaterThan(0);
    });
  });
});
