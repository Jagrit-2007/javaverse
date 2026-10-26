import { describe, it, expect } from 'vitest';
import { MockSandboxClient } from '../src/mock';

describe('MockSandboxClient', () => {
  it('returns valid simulated execution result without executing code', async () => {
    const client = new MockSandboxClient();
    expect(client.providerId).toBe('mock');

    const result = await client.execute({
      code: 'System.out.println("Hello");',
      javaVersion: 'JAVA_21',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.stdout).toContain('JavaVerse Mock Execution');
    expect(result.runnerProvider).toBe('mock');
    expect(result.javaVersion).toBe('JAVA_21');
  });
});
