export interface ExecutionRequest {
  code: string;
  javaVersion: 'JAVA_8' | 'JAVA_11' | 'JAVA_17' | 'JAVA_21' | 'JAVA_25';
  stdin?: string;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export type ExecutionStatus =
  | 'SUCCESS'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR'
  | 'TIMEOUT'
  | 'MEMORY_LIMIT'
  | 'CONTAINMENT_ERROR';

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  memoryKb: number;
  javaVersion: string;
  runnerProvider: string;
}

export interface SandboxClient {
  readonly providerId: string;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
