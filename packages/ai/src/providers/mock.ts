import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';
import { PedagogicalAnalysisSchema, type VisualizationSpec } from '@javaverse/schemas';

export class MockProvider implements AIProvider {
  public readonly providerId = 'mock' as const;

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    const prompt = request.prompt.toLowerCase();
    const isStack =
      prompt.includes('stack') || prompt.includes('bracket') || prompt.includes('parenthes');

    let javaCode = `public class Solution {
    public static int search(int[] nums, int target) {
        int low = 0;
        int high = nums.length - 1;
        while (low <= high) {
            int mid = low + (high - low) / 2;
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) low = mid + 1;
            else high = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] arr = {2, 5, 8, 12, 16, 23, 38, 56};
        System.out.println("Index: " + search(arr, 23));
    }
}`;

    let vizSpec: VisualizationSpec = {
      kind: 'array',
      title: 'Binary Search Step-by-Step',
      summary: 'Visualizing pointer updates across halves of a sorted array.',
      initial: { data: [2, 5, 8, 12, 16, 23, 38, 56] },
      steps: [
        {
          line: 3,
          text: 'Initialize search interval: low=0, high=7',
          state: { low: 0, high: 7, mid: 3, highlight: [3] },
        },
        {
          line: 8,
          text: 'nums[3]=12 < target 23: discard left half, set low=4',
          state: { low: 4, high: 7, mid: 5, highlight: [5] },
        },
        {
          line: 7,
          text: 'nums[5]=23 == target 23: target located at index 5!',
          state: { low: 4, high: 7, mid: 5, found: true, highlight: [5] },
        },
      ],
    };

    if (isStack) {
      javaCode = `import java.util.ArrayDeque;
import java.util.Deque;

public class Solution {
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '{' || c == '[') {
                stack.push(c);
            } else {
                if (stack.isEmpty()) return false;
                char top = stack.pop();
                if (c == ')' && top != '(') return false;
                if (c == '}' && top != '{') return false;
                if (c == ']' && top != '[') return false;
            }
        }
        return stack.isEmpty();
    }
}`;
      vizSpec = {
        kind: 'stack',
        title: 'Bracket Matching Stack Simulation',
        summary: 'Pushing opening brackets and matching closing brackets in LIFO order.',
        initial: { items: [] },
        steps: [
          {
            line: 7,
            text: 'Read opening bracket "(": push to stack',
            state: { items: ['('], action: 'push' },
          },
          {
            line: 7,
            text: 'Read opening bracket "{": push to stack',
            state: { items: ['(', '{'], action: 'push' },
          },
          {
            line: 11,
            text: 'Read closing bracket "}": match and pop "{" from stack',
            state: { items: ['('], action: 'pop' },
          },
          {
            line: 11,
            text: 'Read closing bracket ")": match and pop "(" from stack. Stack empty -> valid!',
            state: { items: [], action: 'pop', valid: true },
          },
        ],
      };
    }

    const rawResult = {
      schemaVersion: 1 as const,
      meta: {
        topic: 'DSA',
        subtopics: ['Algorithm Design', 'Time Complexity', 'Invariants'],
        difficulty: 'MEDIUM' as const,
        questionType: 'CODING',
        javaVersion: '21',
        confidence: 0.98,
      },
      understanding: {
        restatement: `The problem asks us to solve: "${request.prompt.slice(0, 120)}..." in an efficient, verified manner.`,
        inputs: ['Input array / parameters matching question criteria'],
        outputs: ['Result satisfying all declared constraints'],
        constraints: ['Time limit: O(log N) or O(N)', 'Memory limit: O(1) auxiliary space'],
        examples: [
          {
            input: 'arr = [2, 5, 8, 12, 16, 23], target = 23',
            output: '5',
            explanation: 'Found at index 5.',
          },
        ],
        edgeCases: ['Empty input', 'Single-element input', 'Target not present'],
        assumptions: ['Input is valid and pre-conditioned'],
      },
      prerequisites: [
        { concept: 'Array indexing', explanation: 'Elements accessed in O(1) time.' },
        {
          concept: 'Loop invariants',
          explanation: 'Maintaining true conditions across every iteration.',
        },
      ],
      approaches: [
        {
          name: 'Linear Scan',
          pattern: 'Brute Force',
          idea: 'Inspect every element sequentially from start to end.',
          steps: ['Iterate i from 0 to N-1', 'Compare nums[i] with target'],
          time: 'O(N)',
          space: 'O(1)',
          pros: ['Trivial to write', 'Works on unsorted arrays'],
          cons: ['Too slow for large N'],
          recommended: false,
        },
        {
          name: 'Optimal Divide & Conquer',
          pattern: 'Binary Search',
          idea: 'Halve the search space at every step by checking the middle element.',
          steps: ['Set low=0, high=N-1', 'Compute mid', 'Narrow interval based on comparison'],
          time: 'O(log N)',
          space: 'O(1)',
          pros: ['Logarithmic time complexity', 'Ideal for sorted inputs'],
          cons: ['Requires sorted array'],
          recommended: true,
        },
      ],
      solution: {
        code: javaCode,
        explanation: [
          { fromLine: 1, toLine: 5, text: 'Class setup and boundary initialization.' },
          { fromLine: 6, toLine: 12, text: 'Core iteration loop dividing the problem space.' },
        ],
        tests: [
          { name: 'Standard Case', input: 'arr = [2, 5, 8], target = 5', expectedOutput: '1' },
          { name: 'Not Found', input: 'arr = [2, 5, 8], target = 99', expectedOutput: '-1' },
        ],
        dryRun: [
          {
            step: 1,
            line: 3,
            vars: { low: 0, high: 7, mid: 3 },
            note: 'First midpoint calculation',
          },
          {
            step: 2,
            line: 8,
            vars: { low: 4, high: 7, mid: 5 },
            note: 'Narrowing to right subarray',
          },
        ],
      },
      visualizations: [vizSpec],
      pitfalls: [
        'Integer overflow when calculating midpoint: use low + (high - low) / 2 instead of (low + high) / 2.',
        'Off-by-one errors with loop condition <= vs <.',
      ],
      followUps: ['How does this approach generalize to unbounded arrays?'],
      relatedLessons: ['binary-search', 'arrays-arraylist'],
      practice: [
        {
          prompt: 'Implement search in a rotated sorted array.',
          difficulty: 'MEDIUM',
        },
      ],
    };

    const parsed = PedagogicalAnalysisSchema.parse(rawResult);

    return {
      providerId: this.providerId,
      modelId: 'mock-analyzer-v1',
      promptVersion: '1.0.0',
      result: parsed,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    };
  }
}
