import type { SandboxClient } from './types';
import { MockSandboxClient } from './mock';
import { ContainerSandboxClient, type ContainerSandboxOptions } from './containerRunner';

export interface SandboxFactoryOptions extends ContainerSandboxOptions {
  provider?: string;
}

const VALID_PROVIDERS = ['mock', 'container_runner'] as const;

export function getSandboxClient(options?: SandboxFactoryOptions): SandboxClient {
  const provider = options?.provider || process.env.SANDBOX_PROVIDER || 'mock';

  if (!VALID_PROVIDERS.includes(provider as (typeof VALID_PROVIDERS)[number])) {
    throw new Error(
      `Invalid or unsupported sandbox provider: "${provider}". Local Mock is the safe approved default.`,
    );
  }

  if (provider === 'container_runner') {
    return new ContainerSandboxClient(options);
  }

  return new MockSandboxClient();
}
