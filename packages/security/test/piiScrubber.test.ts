import { describe, it, expect } from 'vitest';
import { scrubPii } from '../src/piiScrubber';

describe('piiScrubber', () => {
  it('redacts email addresses', () => {
    const input = 'Please contact me at learner.one@example.com for help with my solution.';
    const result = scrubPii(input);
    expect(result.text).toBe('Please contact me at [REDACTED_EMAIL] for help with my solution.');
    expect(result.redactionCount).toBe(1);
    expect(result.categories).toContain('EMAIL');
  });

  it('redacts IPv4 and IPv6 addresses', () => {
    const input = 'My server runs at 192.168.1.55 or 2001:0db8:85a3:0000:0000:8a2e:0370:7334.';
    const result = scrubPii(input);
    expect(result.text).toContain('[REDACTED_IP]');
    expect(result.text).not.toContain('192.168.1.55');
    expect(result.text).not.toContain('2001:0db8:85a3');
    expect(result.categories).toContain('IP');
  });

  it('redacts URLs', () => {
    const input = 'See my repo at https://github.com/secretuser/private-repo.git.';
    const result = scrubPii(input);
    expect(result.text).toBe('See my repo at [REDACTED_URL].');
    expect(result.categories).toContain('URL');
  });

  it('redacts phone numbers', () => {
    const input = 'Call me at +1 415-555-2671 or (800) 555-0199.';
    const result = scrubPii(input);
    expect(result.text).not.toContain('415-555-2671');
    expect(result.text).not.toContain('555-0199');
    expect(result.categories).toContain('PHONE');
  });

  it('redacts user home directory paths', () => {
    const input = 'Error at /Users/john_smith/projects/JavaVerse/Solution.java:42';
    const result = scrubPii(input);
    expect(result.text).toContain('[REDACTED_PATH]');
    expect(result.text).not.toContain('john_smith');
    expect(result.categories).toContain('PATH');
  });

  it('redacts API secrets, bearer tokens, and JWTs', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature12345';
    const input = `Authorization: Bearer secret-token-value-123456 and api key sk-ant-api03-abcdefghijklmnopqrstuvwxyz and token ${jwt}`;
    const result = scrubPii(input);
    expect(result.text).toContain('[REDACTED_TOKEN]');
    expect(result.text).toContain('[REDACTED_SECRET]');
    expect(result.text).not.toContain('secret-token-value');
    expect(result.text).not.toContain('sk-ant-api03');
  });

  it('redacts personal name introductions and sign-offs', () => {
    const input = 'Hello, my name is Alice Walker. Can you help? Thanks, Bob Marley';
    const result = scrubPii(input);
    expect(result.text).toContain('my name is [REDACTED_NAME]');
    expect(result.text).toContain('Thanks, [REDACTED_NAME]');
    expect(result.text).not.toContain('Alice Walker');
    expect(result.text).not.toContain('Bob Marley');
  });

  it('preserves clean code without false-positive redaction of standard Java constructs', () => {
    const code = `
public class BinarySearch {
    public static int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}
`;
    const result = scrubPii(code);
    expect(result.redactionCount).toBe(0);
    expect(result.text).toBe(code);
  });
});
