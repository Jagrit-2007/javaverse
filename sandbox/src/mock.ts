import type { SandboxClient, ExecutionRequest, ExecutionResult } from './types';

export interface MockSandboxOptions {
  customHandler?: (request: ExecutionRequest) => Partial<ExecutionResult>;
}

export class MockSandboxClient implements SandboxClient {
  public readonly providerId = 'mock';

  constructor(private options?: MockSandboxOptions) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    if (this.options?.customHandler) {
      const custom = this.options.customHandler(request);
      return {
        status: custom.status || 'SUCCESS',
        stdout: custom.stdout ?? 'JavaVerse Mock Execution Output\n',
        stderr: custom.stderr ?? '',
        exitCode: custom.exitCode ?? 0,
        timeMs: custom.timeMs ?? 42,
        memoryKb: custom.memoryKb ?? 1024,
        javaVersion: custom.javaVersion || request.javaVersion,
        runnerProvider: 'mock',
      };
    }

    return {
      status: 'SUCCESS',
      stdout: 'JavaVerse Mock Execution Output\n',
      stderr: '',
      exitCode: 0,
      timeMs: 42,
      memoryKb: 1024,
      javaVersion: request.javaVersion,
      runnerProvider: 'mock',
    };
  }
}
