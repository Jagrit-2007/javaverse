import type { AIProvider, AnalysisRequest, AnalysisResponse } from './types';
import { MockProvider } from './providers/mock';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';

export interface ProviderFactoryOptions {
  primary?: 'mock' | 'anthropic' | 'gemini' | string;
  fallback?: 'mock' | 'anthropic' | 'gemini' | string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
}

export class FallbackProviderWrapper implements AIProvider {
  public readonly providerId: 'mock' | 'anthropic' | 'gemini';
  private readonly primary: AIProvider;
  private readonly fallback: AIProvider;

  constructor(primary: AIProvider, fallback: AIProvider) {
    this.primary = primary;
    this.fallback = fallback;
    this.providerId = primary.providerId;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      return await this.primary.analyze(request);
    } catch {
      return await this.fallback.analyze(request);
    }
  }
}

export function getAIProvider(options?: ProviderFactoryOptions): AIProvider {
  const primaryType = options?.primary || process.env.AI_PROVIDER_PRIMARY || 'mock';
  const fallbackType = options?.fallback || 'mock';

  const createProviderInstance = (type: string): AIProvider => {
    switch (type) {
      case 'anthropic':
        return new AnthropicProvider(
          options?.anthropicApiKey ? { apiKey: options.anthropicApiKey } : {},
        );
      case 'gemini':
        return new GeminiProvider(options?.geminiApiKey ? { apiKey: options.geminiApiKey } : {});
      case 'mock':
      default:
        return new MockProvider();
    }
  };

  const primary = createProviderInstance(primaryType);
  if (primaryType === 'mock') {
    return primary;
  }

  const fallback = createProviderInstance(fallbackType);
  return new FallbackProviderWrapper(primary, fallback);
}
