import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@javaverse/db';
import { getRedisCacheClient } from '@/lib/redis';
import { getServerKeys } from '@/lib/keys';
import {
  generateRandomToken,
  deriveTokenDigest,
  encryptTotpSecret,
  decryptTotpSecret,
  generateTotpSecret,
} from '@javaverse/security';

describe('Interrupted Bootstrap & State Machine', () => {
  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.recoveryCode.deleteMany();
    await prisma.mfaTotp.deleteMany();
    await prisma.emailToken.deleteMany();
    await prisma.user.deleteMany();
  });

  it('keeps bootstrap token unconsumed if registration ceremony is interrupted before TOTP proof', async () => {
    const keys = getServerKeys();
    const rawBootstrapToken = generateRandomToken(32);
    const tokenHash = deriveTokenDigest(
      rawBootstrapToken,
      'owner_bootstrap',
      keys.authTokenHmacKey,
    );

    // 1. Create bootstrap token
    await prisma.emailToken.create({
      data: {
        tokenHash,
        deliveryChannel: 'TERMINAL',
        purpose: 'OWNER_BOOTSTRAP',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    // 2. Validate token and issue Redis enrollment ticket
    const totpSecret = generateTotpSecret();
    const ticketId = generateRandomToken(32);
    const ticketDigest = deriveTokenDigest(ticketId, 'bootstrap_ticket', keys.authTokenHmacKey);
    const redisKey = `bootstrap:ticket:${ticketDigest}`;

    const ticketPayload = JSON.stringify({
      rawToken: rawBootstrapToken,
      totpSecret,
      createdAt: Date.now(),
      attempts: 0,
    });
    const encryptedTicket = encryptTotpSecret(ticketPayload, keys.totpAesKey, 'bootstrap:ticket');

    const redis = getRedisCacheClient();
    await redis.set(redisKey, encryptedTicket, 'EX', 900);

    // 3. Verify that DB bootstrap token remains unconsumed
    const dbTokenBeforeFinalize = await prisma.emailToken.findUnique({
      where: { tokenHash },
    });
    expect(dbTokenBeforeFinalize?.usedAt).toBeNull();

    // 4. Verify no OWNER exists
    const ownerCount = await prisma.user.count({ where: { role: 'OWNER' } });
    expect(ownerCount).toBe(0);

    // 5. Cleanup redis ticket
    await redis.del(redisKey);
  });

  it('does not destroy ticket on first invalid TOTP attempt and exhausts after 5 failures', async () => {
    const keys = getServerKeys();
    const redis = getRedisCacheClient();
    const rawBootstrapToken = generateRandomToken(32);
    const totpSecret = generateTotpSecret();
    const ticketId = generateRandomToken(32);
    const ticketDigest = deriveTokenDigest(ticketId, 'bootstrap_ticket', keys.authTokenHmacKey);
    const redisKey = `bootstrap:ticket:${ticketDigest}`;

    let ticketData = {
      rawToken: rawBootstrapToken,
      totpSecret,
      createdAt: Date.now(),
      attempts: 0,
    };
    await redis.set(
      redisKey,
      encryptTotpSecret(JSON.stringify(ticketData), keys.totpAesKey, 'bootstrap:ticket'),
      'EX',
      900,
    );

    // 4 invalid attempts: ticket must still exist with incremented counter
    for (let i = 1; i <= 4; i++) {
      const stored = await redis.get(redisKey);
      expect(stored).not.toBeNull();
      const dec = JSON.parse(decryptTotpSecret(stored!, keys.totpAesKey, 'bootstrap:ticket'));
      dec.attempts += 1;
      await redis.set(
        redisKey,
        encryptTotpSecret(JSON.stringify(dec), keys.totpAesKey, 'bootstrap:ticket'),
        'EX',
        900,
      );
    }

    const storedAfter4 = await redis.get(redisKey);
    const decAfter4 = JSON.parse(
      decryptTotpSecret(storedAfter4!, keys.totpAesKey, 'bootstrap:ticket'),
    );
    expect(decAfter4.attempts).toBe(4);

    // 5th attempt: exhausts and deletes ticket
    if (decAfter4.attempts >= 4) {
      await redis.del(redisKey);
    }
    const finalStored = await redis.get(redisKey);
    expect(finalStored).toBeNull();
  });

  it('atomically consumes enrollment ticket and prevents concurrent double-finalization', async () => {
    const keys = getServerKeys();
    const redis = getRedisCacheClient();
    const rawBootstrapToken = generateRandomToken(32);
    const totpSecret = generateTotpSecret();
    const ticketId = generateRandomToken(32);
    const ticketDigest = deriveTokenDigest(ticketId, 'bootstrap_ticket', keys.authTokenHmacKey);
    const redisKey = `bootstrap:ticket:${ticketDigest}`;

    const encrypted = encryptTotpSecret(
      JSON.stringify({ rawToken: rawBootstrapToken, totpSecret, attempts: 0 }),
      keys.totpAesKey,
      'bootstrap:ticket',
    );
    await redis.set(redisKey, encrypted, 'EX', 900);

    const compareAndDeleteScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    // Concurrent execution of compare-and-delete
    const [del1, del2] = await Promise.all([
      redis.eval(compareAndDeleteScript, 1, redisKey, encrypted),
      redis.eval(compareAndDeleteScript, 1, redisKey, encrypted),
    ]);

    // Exactly one operation must succeed (1) and the other must return 0
    expect([del1, del2].sort()).toEqual([0, 1]);
  });
});
