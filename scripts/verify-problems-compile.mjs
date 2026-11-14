import { PRACTICE_PROBLEMS } from '../packages/db/src/data/problems.ts';
import { ContainerSandboxClient } from '../sandbox/src/containerRunner.ts';

console.log(
  `Verifying all ${PRACTICE_PROBLEMS.length} practice problems compile and pass against real Docker container...`,
);

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

let passed = 0;

for (const p of PRACTICE_PROBLEMS) {
  process.stdout.write(`Testing problem '${p.slug}'... `);
  const fullSource = assembleJavaSource([p.testHarness, p.solutionCode]);

  const res = await runner.execute({
    code: fullSource,
    javaVersion: '21',
    timeoutMs: 5000,
  });

  if (res.status !== 'SUCCESS' || !res.stdout.includes('TEST_PASSED')) {
    console.error(`\nFAILED problem '${p.slug}':`);
    console.error('STDOUT:', res.stdout);
    console.error('STDERR:', res.stderr);
    process.exit(1);
  }

  console.log(`PASSED (${res.timeMs}ms)`);
  passed++;
}

console.log(
  `\nResults: Successfully verified all ${passed}/${PRACTICE_PROBLEMS.length} practice problems!`,
);
