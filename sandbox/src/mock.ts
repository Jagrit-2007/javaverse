import type { SandboxClient, ExecutionRequest, ExecutionResult } from './types';

export class MockSandboxClient implements SandboxClient {
  public readonly providerId = 'mock';

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
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
