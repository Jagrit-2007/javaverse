import { describe, it, expect } from 'vitest';
import { ContainerSandboxClient } from '../src/containerRunner';
import { MockSandboxClient } from '../src/mock';
import { getSandboxClient } from '../src/factory';

describe('Sandbox Provider & Containment Tests', () => {
  it('MockSandboxClient returns deterministic mock result', async () => {
    const mock = new MockSandboxClient();
    const res = await mock.execute({
      code: 'class Test {}',
      javaVersion: 'JAVA_21',
    });
    expect(res.status).toBe('SUCCESS');
    expect(res.runnerProvider).toBe('mock');
    expect(res.stdout).toContain('JavaVerse Mock');
  });

  it('getSandboxClient returns appropriate provider', () => {
    const mockClient = getSandboxClient({ provider: 'mock' });
    expect(mockClient.providerId).toBe('mock');

    const containerClient = getSandboxClient({ provider: 'container_runner' });
    expect(containerClient.providerId).toBe('container_runner');
  });

  describe('ContainerSandboxClient (Real Containment Spike)', () => {
    const runner = new ContainerSandboxClient({ defaultTimeoutMs: 10000 });

    it('successfully compiles and runs valid Java 21 code', async () => {
      const code = `
public class Solution {
    public static void main(String[] args) {
        int a = 10;
        int b = 32;
        System.out.println("Result: " + (a + b));
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('SUCCESS');
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toContain('Result: 42');
      expect(res.runnerProvider).toBe('container_runner');
    });

    it('reports COMPILATION_ERROR for syntax errors', async () => {
      const code = `
public class BadSyntax {
    public static void main(String[] args) {
        int x = "incompatible types";
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('COMPILATION_ERROR');
      expect(res.stderr).toContain('incompatible types');
    });

    it('reports RUNTIME_ERROR for uncaught exceptions', async () => {
      const code = `
public class Crash {
    public static void main(String[] args) {
        int[] arr = new int[2];
        System.out.println(arr[99]);
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('RUNTIME_ERROR');
      expect(res.stderr).toContain('ArrayIndexOutOfBoundsException');
    });

    it('terminates infinite loop with TIMEOUT status', async () => {
      const code = `
public class InfiniteLoop {
    public static void main(String[] args) {
        while (true) {}
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
        timeoutMs: 2000,
      });
      expect(res.status).toBe('TIMEOUT');
      expect(res.stderr).toContain('Execution timed out');
    });

    it('contains network egress and reports CONTAINMENT_ERROR', async () => {
      const code = `
public class NetEgress {
    public static void main(String[] args) throws Exception {
        new java.net.Socket("8.8.8.8", 80);
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('CONTAINMENT_ERROR');
      expect(res.stderr).toMatch(/Network unreachable|SocketException/);
    });
  });
});
