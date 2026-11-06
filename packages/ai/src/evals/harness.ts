export interface ParsedBlock {
  name: string;
  kind: 'class' | 'interface' | 'record' | 'enum';
  code: string;
}

/**
 * Extracts top-level class, interface, record, and enum blocks with brace-matching.
 */
export function extractTypeBlocks(source: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const pattern =
    /(?:^|\n)[ \t]*(?:public\s+|abstract\s+|sealed\s+|final\s+|non-sealed\s+)*(class|interface|record|enum)\s+([A-Za-z0-9_$]+)[^{]*\{/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const kind = match[1] as 'class' | 'interface' | 'record' | 'enum' | undefined;
    const name = match[2];
    if (!kind || !name) continue;

    const matchStart = match.index + (match[0].startsWith('\n') ? 1 : 0);
    const braceIndex = source.indexOf('{', match.index);
    if (braceIndex === -1) break;

    let depth = 0;
    let endIndex = -1;
    for (let i = braceIndex; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }

    if (endIndex !== -1) {
      blocks.push({
        name,
        kind,
        code: source.slice(matchStart, endIndex).trim(),
      });
      pattern.lastIndex = endIndex;
    }
  }

  return blocks;
}

/**
 * Combines private golden test assertions with model-generated solution code into a single
 * runnable Java compilation unit.
 *
 * Rules:
 * 1. Strips markdown fences if present in modelCode.
 * 2. Extracts all import statements from testCode and modelCode, deduplicates them, and places
 *    them at the top of the compilation unit.
 * 3. Strips package declarations from both sources.
 * 4. Extracts the Harness class from testCode (which contains private test assertions).
 * 5. Extracts any non-solution support/fixture types from testCode (e.g., ListNode, TreeNode).
 *    If modelCode defines the same type name, the model's version is used and the fixture is omitted.
 * 6. Strips top-level 'public' modifier from modelCode type declarations so public class Harness
 *    remains the single public class in the compilation unit.
 * 7. Never includes the static reference solution from testCode when testing modelCode.
 */
export function buildEvaluationHarness(testCode: string, modelCode: string): string {
  if (!modelCode || !modelCode.trim()) {
    throw new Error('Model solution code must not be empty');
  }

  // 1. Strip markdown fences if present
  let cleanModel = modelCode.trim();
  if (cleanModel.startsWith('```')) {
    cleanModel = cleanModel
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }

  // 2. Extract and deduplicate imports
  const importRegex = /^[ \t]*import\s+[^;]+;\s*$/gm;
  const testImports = testCode.match(importRegex) || [];
  const modelImports = cleanModel.match(importRegex) || [];
  const uniqueImports = Array.from(
    new Set([...testImports.map((i) => i.trim()), ...modelImports.map((i) => i.trim())]),
  );

  // 3. Remove package declarations and imports from bodies
  const packageRegex = /^[ \t]*package\s+[^;]+;\s*$/gm;
  const cleanTestWithoutImports = testCode
    .replace(importRegex, '')
    .replace(packageRegex, '')
    .trim();
  cleanModel = cleanModel.replace(importRegex, '').replace(packageRegex, '').trim();

  // 4. Extract Harness block
  const testBlocks = extractTypeBlocks(cleanTestWithoutImports);
  const harnessBlock = testBlocks.find((b) => b.name === 'Harness');
  if (!harnessBlock) {
    throw new Error('Golden test code does not define a Harness class');
  }

  // 5. Extract support fixtures from test code
  // Any non-Harness block in testCode:
  // If testCode defines Solution, then Solution is the reference solution and should NOT be kept as a fixture.
  // Any other non-Harness block (e.g. ListNode, TreeNode, Account) is a support fixture.
  // If testCode does not define Solution, all types after Harness are reference solution classes.
  const hasSolutionInTest = testBlocks.some((b) => b.name === 'Solution');
  const modelBlocks = extractTypeBlocks(cleanModel);
  const modelTypeNames = new Set(modelBlocks.map((b) => b.name));

  const fixtures = hasSolutionInTest
    ? testBlocks.filter(
        (b) => b.name !== 'Harness' && b.name !== 'Solution' && !modelTypeNames.has(b.name),
      )
    : [];

  // 6. Strip 'public' from top-level types in model code to allow compilation with public class Harness
  cleanModel = cleanModel.replace(
    /(^|\n)([ \t]*)public\s+(final\s+|abstract\s+|sealed\s+|non-sealed\s+)?(class|interface|record|enum)\b/g,
    '$1$2$3$4',
  );

  // 7. Combine pieces
  const parts: string[] = [];
  if (uniqueImports.length > 0) {
    parts.push(uniqueImports.join('\n'));
  }
  parts.push(harnessBlock.code);
  for (const fixture of fixtures) {
    parts.push(fixture.code);
  }
  parts.push(cleanModel);

  return parts.join('\n\n');
}
