import { spawn } from 'node:child_process';
import type { SandboxClient, ExecutionRequest, ExecutionResult, ExecutionStatus } from './types';

export interface ContainerSandboxOptions {
  dockerBinary?: string;
  defaultTimeoutMs?: number;
  defaultMemoryLimitMb?: number;
  imageMap?: Record<string, string>;
}

const DEFAULT_IMAGE_MAP: Record<string, string> = {
  JAVA_8: 'eclipse-temurin:8-alpine',
  JAVA_11: 'eclipse-temurin:11-alpine',
  JAVA_17: 'eclipse-temurin:17-alpine',
  JAVA_21: 'eclipse-temurin:21-alpine',
  JAVA_25: 'eclipse-temurin:25-alpine',
};

export class ContainerSandboxClient implements SandboxClient {
  public readonly providerId = 'container_runner';
  private dockerBinary: string;
  private defaultTimeoutMs: number;
  private defaultMemoryLimitMb: number;
  private imageMap: Record<string, string>;

  constructor(options?: ContainerSandboxOptions) {
    this.dockerBinary = options?.dockerBinary || 'docker';
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 5000;
    this.defaultMemoryLimitMb = options?.defaultMemoryLimitMb || 256;
    this.imageMap = { ...DEFAULT_IMAGE_MAP, ...(options?.imageMap || {}) };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const memoryLimitMb = request.memoryLimitMb || this.defaultMemoryLimitMb;
    const image = this.imageMap[request.javaVersion] || 'eclipse-temurin:21-alpine';

    // Extract class name from code (e.g. "public class Solution") or default to "Solution"
    const classMatch = request.code.match(/public\s+(?:final\s+)?class\s+([A-Za-z0-9_]+)/);
    const className = classMatch ? classMatch[1] : 'Solution';

    // Script to write code to /tmp, compile, and run
    const script = `
cat << 'EOF' > /tmp/${className}.java
${request.code}
EOF
javac /tmp/${className}.java
if [ $? -ne 0 ]; then
  exit 42
fi
java -cp /tmp ${className}
`;

    const dockerArgs = [
      'run',
      '--rm',
      '-i',
      '--network',
      'none',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,nosuid,size=64m',
      `--memory=${memoryLimitMb}m`,
      `--memory-swap=${memoryLimitMb}m`,
      '--cpus=1.0',
      '--pids-limit=64',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      image,
      'sh',
      '-c',
      script,
    ];

    return new Promise<ExecutionResult>((resolve) => {
      let isTimedOut = false;
      const child = spawn(this.dockerBinary, dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, timeoutMs);

      if (request.stdin) {
        child.stdin.write(request.stdin);
      }
      child.stdin.end();

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        // Cap stdout at 64KB
        if (stdout.length > 65536) {
          stdout = stdout.substring(0, 65536) + '\n[Output truncated at 64KB]';
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (stderr.length > 65536) {
          stderr = stderr.substring(0, 65536) + '\n[Stderr truncated at 64KB]';
        }
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const elapsedMs = Date.now() - startTime;

        let status: ExecutionStatus = 'SUCCESS';

        if (isTimedOut) {
          status = 'TIMEOUT';
          stderr += `\nExecution timed out after ${timeoutMs}ms`;
        } else if (code === 42) {
          status = 'COMPILATION_ERROR';
        } else if (code === 137 || stderr.includes('OutOfMemoryError')) {
          status = 'MEMORY_LIMIT';
        } else if (stderr.includes('SocketException') || stderr.includes('Network unreachable')) {
          status = 'CONTAINMENT_ERROR';
        } else if (code !== 0 || stderr.includes('Exception in thread')) {
          status = 'RUNTIME_ERROR';
        }

        resolve({
          status,
          stdout,
          stderr,
          exitCode: code ?? (isTimedOut ? 124 : 1),
          timeMs: elapsedMs,
          memoryKb: Math.min(memoryLimitMb * 1024, 65536),
          javaVersion: request.javaVersion,
          runnerProvider: this.providerId,
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          status: 'CONTAINMENT_ERROR',
          stdout: '',
          stderr: `Failed to spawn sandbox container: ${err.message}`,
          exitCode: 1,
          timeMs: Date.now() - startTime,
          memoryKb: 0,
          javaVersion: request.javaVersion,
          runnerProvider: this.providerId,
        });
      });
    });
  }
}
