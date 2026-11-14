import { LAUNCH_LESSONS } from '../packages/db/src/data/lessons.ts';
import { ContainerSandboxClient } from '../sandbox/src/containerRunner.ts';

console.log('Testing compilation of all 12 launch lessons on Java 21 container...');
const runner = new ContainerSandboxClient();

function assembleJavaSource(parts) {
  const imports = new Set();
  const body = [];
  for (const part of parts) {
    for (const line of part.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') && trimmed.endsWith(';')) {
        imports.add(trimmed);
      } else {
        body.push(line);
      }
    }
  }
  return `${Array.from(imports).join('\n')}\n\n${body.join('\n')}`;
}

let passedCount = 0;
for (const lesson of LAUNCH_LESSONS) {
  process.stdout.write(`Testing [${lesson.slug}] starter code... `);
  const starterResult = await runner.execute({
    code: lesson.codeStarter,
    javaVersion: '21',
    timeoutMs: 5000,
  });

  if (starterResult.status !== 'SUCCESS') {
    console.error(`\nFAILED starter code for ${lesson.slug}:`);
    console.error('STDOUT:', starterResult.stdout);
    console.error('STDERR:', starterResult.stderr);
    process.exit(1);
  }
  process.stdout.write(`OK. Testing challenge harness... `);

  // Combine test code (entrypoint) and solution code with hoisted imports
  const fullChallengeCode = assembleJavaSource([
    lesson.challenge.testCode,
    lesson.challenge.solutionCode,
  ]);
  const challengeResult = await runner.execute({
    code: fullChallengeCode,
    javaVersion: '21',
    timeoutMs: 5000,
  });

  if (challengeResult.status !== 'SUCCESS') {
    console.error(`\nFAILED challenge for ${lesson.slug}:`);
    console.error('STDOUT:', challengeResult.stdout);
    console.error('STDERR:', challengeResult.stderr);
    process.exit(1);
  }

  console.log(`OK! (Time: ${challengeResult.timeMs}ms)`);
  passedCount++;
}

console.log(
  `\nSuccessfully verified all ${passedCount}/12 lessons compiled and executed on Java 21!`,
);
