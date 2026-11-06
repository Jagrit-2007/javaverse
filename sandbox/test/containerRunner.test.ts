import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
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

    it('neutralizes embedded heredoc terminators as inert source data', async () => {
      const code = `
public class HeredocSafety {
    public static void main(String[] args) {
        String s = "EOF\\nrm -rf /tmp/*\\ncat << 'EOF'";
        System.out.println("HEREDOC_SAFE:" + s.length());
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('SUCCESS');
      expect(res.stdout).toContain('HEREDOC_SAFE:30');
    });

    it('neutralizes shell metacharacters without command execution', async () => {
      const code = `
public class ShellMetachars {
    public static void main(String[] args) {
        String s = "$(id); \`whoami\`; echo PWNED; || && > /tmp/pwned";
        System.out.println("METACHARS_SAFE:" + s);
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('SUCCESS');
      expect(res.stdout).toContain(
        'METACHARS_SAFE:$(id); `whoami`; echo PWNED; || && > /tmp/pwned',
      );
    });

    it('strictly rejects invalid class name identifiers before spawning container', async () => {
      const code = `
public class Malicious;rm -rf / {
    public static void main(String[] args) {}
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('COMPILATION_ERROR');
      expect(res.stderr).toContain('Invalid Java class name identifier');
    });

    it('executes container processes as non-root UID 1000', async () => {
      const code = `
public class NonRootCheck {
    public static void main(String[] args) throws Exception {
        Process p = Runtime.getRuntime().exec(new String[]{"id", "-u"});
        java.io.BufferedReader r = new java.io.BufferedReader(new java.io.InputStreamReader(p.getInputStream()));
        String uid = r.readLine();
        System.out.println("UID:" + uid);
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('SUCCESS');
      expect(res.stdout).toContain('UID:1000');
    });

    it('deterministic timeout termination leaves no running or stopped orphan container', async () => {
      const code = `
public class InfiniteLoopCleanup {
    public static void main(String[] args) {
        while (true) {}
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
        timeoutMs: 1500,
      });
      expect(res.status).toBe('TIMEOUT');

      // Verify Docker daemon inspection: zero orphan containers matching javaverse-sandbox-
      const psOutput = execSync(
        'docker ps -a --filter name=javaverse-sandbox- --format "{{.Names}}"',
        {
          encoding: 'utf8',
        },
      ).trim();
      expect(psOutput).toBe('');
    });

    it('cleans up containers reliably on compilation failure', async () => {
      const code = `
public class FailCleanup {
    public static void main(String[] args) {
        int x = invalidSyntax;
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('COMPILATION_ERROR');

      const psOutput = execSync(
        'docker ps -a --filter name=javaverse-sandbox- --format "{{.Names}}"',
        {
          encoding: 'utf8',
        },
      ).trim();
      expect(psOutput).toBe('');
    });

    it('fails closed when image digest pinning is missing', async () => {
      const unpinnedRunner = new ContainerSandboxClient({
        imageMap: {
          JAVA_21: 'eclipse-temurin:21-alpine', // Unpinned tag without @sha256 digest
        },
      });

      const res = await unpinnedRunner.execute({
        code: 'public class Solution { public static void main(String[] args) {} }',
        javaVersion: 'JAVA_21',
      });
      expect(res.status).toBe('CONTAINMENT_ERROR');
      expect(res.stderr).toContain('Image digest pinning is required');
    });

    it('truncates excessive stdout safely at 64KB', async () => {
      const code = `
public class LargeOutput {
    public static void main(String[] args) {
        for (int i = 0; i < 2000; i++) {
            System.out.println("01234567890123456789012345678901234567890123456789");
        }
    }
}
`;
      const res = await runner.execute({
        code,
        javaVersion: 'JAVA_21',
      });
      expect(res.stdout).toContain('[Output truncated at 64KB]');
      expect(res.stdout.length).toBeLessThanOrEqual(66000);
    });

    it('handles concurrent requests with unique container names safely', async () => {
      const code = `
public class ConcurrentTest {
    public static void main(String[] args) {
        System.out.println("CONCURRENT_OK");
    }
}
`;
      const promises = Array.from({ length: 3 }, () =>
        runner.execute({
          code,
          javaVersion: 'JAVA_21',
        }),
      );

      const results = await Promise.all(promises);
      for (const res of results) {
        expect(res.status).toBe('SUCCESS');
        expect(res.stdout).toContain('CONCURRENT_OK');
      }

      const psOutput = execSync(
        'docker ps -a --filter name=javaverse-sandbox- --format "{{.Names}}"',
        {
          encoding: 'utf8',
        },
      ).trim();
      expect(psOutput).toBe('');
    });
  });
});
