import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAUNCH_LESSONS } from './data/lessons.ts';
import { PRACTICE_PROBLEMS } from './data/problems.ts';

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
    },
    create: {
      id: 1,
      maxUsers: 5,
    },
  });

  console.log(`Seeded deployment_limits singleton: max_users=${limits.maxUsers}`);

  let seededCount = 0;
  for (const lesson of LAUNCH_LESSONS) {
    await prisma.curriculumLesson.upsert({
      where: { slug: lesson.slug },
      update: {
        title: lesson.title,
        track: lesson.track,
        module: lesson.module,
        orderIndex: lesson.orderIndex,
        published: lesson.published,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        hook: lesson.hook,
        contentSimple: lesson.contentSimple,
        contentStandard: lesson.contentStandard,
        contentDeep: lesson.contentDeep,
        visualization: lesson.visualization,
        codeStarter: lesson.codeStarter,
        codeSolution: lesson.codeSolution,
        commonMistakes: lesson.commonMistakes,
        quiz: lesson.quiz,
        challenge: lesson.challenge,
        javaVersion: lesson.javaVersion,
        metadata: lesson.metadata,
      },
      create: {
        slug: lesson.slug,
        title: lesson.title,
        track: lesson.track,
        module: lesson.module,
        orderIndex: lesson.orderIndex,
        published: lesson.published,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        hook: lesson.hook,
        contentSimple: lesson.contentSimple,
        contentStandard: lesson.contentStandard,
        contentDeep: lesson.contentDeep,
        visualization: lesson.visualization,
        codeStarter: lesson.codeStarter,
        codeSolution: lesson.codeSolution,
        commonMistakes: lesson.commonMistakes,
        quiz: lesson.quiz,
        challenge: lesson.challenge,
        javaVersion: lesson.javaVersion,
        metadata: lesson.metadata,
      },
    });
    seededCount++;
  }

  console.log(`Seeded ${seededCount} curriculum lessons successfully.`);

  let seededProblemsCount = 0;
  for (const prob of PRACTICE_PROBLEMS) {
    await prisma.practiceProblem.upsert({
      where: { slug: prob.slug },
      update: {
        title: prob.title,
        topic: prob.topic,
        difficulty: prob.difficulty,
        orderIndex: prob.orderIndex,
        prompt: prob.prompt,
        starterCode: prob.starterCode,
        solutionCode: prob.solutionCode,
        sampleTests: prob.sampleTests,
        hiddenTests: prob.hiddenTests,
        hints: prob.hints,
        testHarness: prob.testHarness,
        published: prob.published,
      },
      create: {
        slug: prob.slug,
        title: prob.title,
        topic: prob.topic,
        difficulty: prob.difficulty,
        orderIndex: prob.orderIndex,
        prompt: prob.prompt,
        starterCode: prob.starterCode,
        solutionCode: prob.solutionCode,
        sampleTests: prob.sampleTests,
        hiddenTests: prob.hiddenTests,
        hints: prob.hints,
        testHarness: prob.testHarness,
        published: prob.published,
      },
    });
    seededProblemsCount++;
  }

  console.log(`Seeded ${seededProblemsCount} practice problems successfully.`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
