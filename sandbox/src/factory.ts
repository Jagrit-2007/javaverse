import type { SandboxClient } from './types';
import { MockSandboxClient } from './mock';
import { ContainerSandboxClient, type ContainerSandboxOptions } from './containerRunner';

export interface SandboxFactoryOptions extends ContainerSandboxOptions {
  provider?: string;
}

export function getSandboxClient(options?: SandboxFactoryOptions): SandboxClient {
  const provider = options?.provider || process.env.SANDBOX_PROVIDER || 'mock';

  if (provider === 'container_runner') {
    return new ContainerSandboxClient(options);
  }

  return new MockSandboxClient();
}
