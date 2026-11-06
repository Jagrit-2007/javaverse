import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import type { SandboxClient, ExecutionRequest, ExecutionResult, ExecutionStatus } from './types';

export interface ContainerSandboxOptions {
  dockerBinary?: string;
  defaultTimeoutMs?: number;
  defaultMemoryLimitMb?: number;
  imageMap?: Record<string, string>;
  runAsUser?: string;
}

const DEFAULT_IMAGE_MAP: Record<string, string> = {
  JAVA_21:
    'eclipse-temurin:21-alpine@sha256:b78a1d385da875588e21207f07dddf9a1418849971ae857fb24c8f3a7d441a72',
};

const JAVA_IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]{0,127}$/;

export function extractAndValidateClassName(
  code: string,
): { className: string } | { error: string } {
  const classMatch = code.match(/public\s+(?:final\s+)?class\s+([^\s{]+)/);
  if (classMatch) {
    const candidate = classMatch[1]!;
    if (!JAVA_IDENTIFIER_REGEX.test(candidate)) {
      return { error: `Invalid Java class name identifier: '${candidate}'` };
    }
    return { className: candidate };
  }
  return { className: 'Solution' };
}

export function isPinnedDigest(image: string): boolean {
  return /@sha256:[a-f0-9]{64}$/.test(image);
}

export class ContainerSandboxClient implements SandboxClient {
  public readonly providerId = 'container_runner';
  private dockerBinary: string;
  private defaultTimeoutMs: number;
  private defaultMemoryLimitMb: number;
  private imageMap: Record<string, string>;
  private runAsUser: string;

  constructor(options?: ContainerSandboxOptions) {
    this.dockerBinary = options?.dockerBinary || 'docker';
    this.defaultTimeoutMs = options?.defaultTimeoutMs || 5000;
    this.defaultMemoryLimitMb = options?.defaultMemoryLimitMb || 256;
    this.imageMap = { ...DEFAULT_IMAGE_MAP, ...(options?.imageMap || {}) };
    this.runAsUser = options?.runAsUser || '1000:1000';
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const memoryLimitMb = request.memoryLimitMb || this.defaultMemoryLimitMb;

    // 1. Validate image digest pinning (fail closed if immutable digest is absent)
    const rawImage = this.imageMap[request.javaVersion];
    if (!rawImage || !isPinnedDigest(rawImage)) {
      return {
        status: 'CONTAINMENT_ERROR',
        stdout: '',
        stderr: `Image digest pinning is required for container_runner: image for ${request.javaVersion} is missing or not pinned with an immutable @sha256 digest`,
        exitCode: 1,
        timeMs: Date.now() - startTime,
        memoryKb: 0,
        javaVersion: request.javaVersion,
        runnerProvider: this.providerId,
      };
    }
    const image = rawImage;

    // 2. Validate class name against strict Java identifier rule
    const classValidation = extractAndValidateClassName(request.code);
    if ('error' in classValidation) {
      return {
        status: 'COMPILATION_ERROR',
        stdout: '',
        stderr: classValidation.error,
        exitCode: 1,
        timeMs: Date.now() - startTime,
        memoryKb: 0,
        javaVersion: request.javaVersion,
        runnerProvider: this.providerId,
      };
    }
    const className = classValidation.className;

    // 3. Unique validated container name
    const containerName = `javaverse-sandbox-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    // 4. Fixed runner script - NO user code interpolation, code passed via stdin
    const fixedRunnerScript =
      'cat > /tmp/"$1".java && javac /tmp/"$1".java || exit 42; java -cp /tmp "$1"';

    const dockerArgs = [
      'run',
      '--name',
      containerName,
      '--rm',
      '-i',
      '--user',
      this.runAsUser,
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
      fixedRunnerScript,
      'runner',
      className,
    ];

    const killAndCleanContainer = () => {
      try {
        execFileSync(this.dockerBinary, ['kill', containerName], {
          stdio: 'ignore',
          timeout: 5000,
        });
      } catch {
        // container may have already exited
      }
      try {
        execFileSync(this.dockerBinary, ['rm', '-f', containerName], {
          stdio: 'ignore',
          timeout: 5000,
        });
      } catch {
        // container already cleaned up
      }
    };

    return new Promise<ExecutionResult>((resolve) => {
      let isTimedOut = false;
      let isResolved = false;

      const safeResolve = (result: ExecutionResult) => {
        if (!isResolved) {
          isResolved = true;
          killAndCleanContainer();
          resolve(result);
        }
      };

      const child = spawn(this.dockerBinary, dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          killAndCleanContainer();
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, timeoutMs);

      // Write code through stdin as inert bytes
      child.stdin.write(request.code);
      child.stdin.end();

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (stdout.length > 65536) {
          stdout = stdout.substring(0, 65536) + '\n[Output truncated at 64KB]';
          try {
            killAndCleanContainer();
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

        safeResolve({
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
        safeResolve({
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
