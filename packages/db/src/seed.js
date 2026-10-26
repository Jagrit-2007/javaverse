import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(__dirname, '../.env.local') });
  dotenv.config({ path: resolve(__dirname, '../.env') });
}

const prisma = new PrismaClient();

async function main() {
  const limits = await prisma.deploymentLimits.upsert({
    where: { id: 1 },
    update: {
      maxUsers: 5,
      registrationMode: 'invite_only',
    },
    create: {
      id: 1,
      maxUsers: 5,
      registrationMode: 'invite_only',
    },
  });

  console.log(
    `Seeded deployment_limits singleton: max_users=${limits.maxUsers}, registration_mode=${limits.registrationMode}`,
  );
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
