import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, PrismaClient, assertSafeTestDatabase } from '@javaverse/db';

describe('Development Database Persistence & Test Isolation (Section 1 #17)', () => {
  const devDbUrl = 'postgresql://javaverse:javaverse@127.0.0.1:5432/javaverse?schema=public';
  const markerEmail = `marker-learner-${Date.now()}@example.local`;
  let devPrisma: PrismaClient;

  beforeAll(async () => {
    // 1. Verify our test client is strictly targeting an allowlisted test database
    assertSafeTestDatabase(process.env.DATABASE_URL);

    // 2. Connect to the development database directly to plant the marker learner
    devPrisma = new PrismaClient({
      datasources: { db: { url: devDbUrl } },
    });

    await devPrisma.user.create({
      data: {
        email: markerEmail,
        displayName: 'Protected Marker Learner',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Clean up only our specific marker record from the development database
    if (devPrisma) {
      await devPrisma.user.deleteMany({
        where: { email: markerEmail },
      });
      await devPrisma.$disconnect();
    }
  });

  it('proves test cleanup against javaverse_test does not delete or touch accounts in javaverse', async () => {
    // 1. Verify marker exists in development database
    const initialDevUser = await devPrisma.user.findUnique({
      where: { email: markerEmail },
    });
    expect(initialDevUser).not.toBeNull();
    expect(initialDevUser?.email).toBe(markerEmail);

    // 2. Perform test-database operations and destructive cleanup against javaverse_test
    assertSafeTestDatabase(process.env.DATABASE_URL);
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // 3. Create a test user in javaverse_test
    const testUser = await prisma.user.create({
      data: {
        email: 'test-user@example.local',
        displayName: 'Test User',
        status: 'ACTIVE',
      },
    });
    expect(testUser.id).toBeDefined();

    // 4. Clean up test database again
    await prisma.user.deleteMany();
    const countInTestDb = await prisma.user.count();
    expect(countInTestDb).toBe(0);

    // 5. CRITICAL ASSERTION: Verify the marker learner in the development database remains completely untouched!
    const postTestDevUser = await devPrisma.user.findUnique({
      where: { email: markerEmail },
    });
    expect(postTestDevUser).not.toBeNull();
    expect(postTestDevUser?.id).toBe(initialDevUser?.id);
    expect(postTestDevUser?.email).toBe(markerEmail);
    expect(postTestDevUser?.displayName).toBe('Protected Marker Learner');
  });
});
