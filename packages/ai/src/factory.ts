import type { AIProvider, AnalysisRequest, AnalysisResponse } from './types';
import { MockProvider } from './providers/mock';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';

export const ALLOWED_AI_PROVIDERS = ['mock', 'gemini', 'anthropic'] as const;
export type AIProviderId = (typeof ALLOWED_AI_PROVIDERS)[number];

export const ALLOWED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;

export const ALLOWED_ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
] as const;

export const LOCAL_MOCK_MODEL = 'javaverse-local-mock';

export interface ProviderFactoryOptions {
  primary?: 'mock' | 'anthropic' | 'gemini' | string | undefined;
  fallback?: 'mock' | 'anthropic' | 'gemini' | string | undefined;
  model?: string | undefined;
  anthropicApiKey?: string | undefined;
  geminiApiKey?: string | undefined;
  externalAiEnabled?: boolean | undefined;
  allowDevFallback?: boolean | undefined;
  timeoutMs?: number | undefined;
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
      const fallbackResponse = await this.fallback.analyze(request);
      return {
        ...fallbackResponse,
        providerId: this.fallback.providerId,
        fallbackUsed: true,
        fallbackReason: 'External provider unavailable. Showing a Local Mock response.',
      };
    }
  }
}

export function getAIProvider(options?: ProviderFactoryOptions): AIProvider {
  const rawPrimary = options?.primary || process.env.AI_PROVIDER_PRIMARY || 'mock';
  if (!ALLOWED_AI_PROVIDERS.includes(rawPrimary as AIProviderId)) {
    throw new Error(
      `Invalid AI provider '${rawPrimary}'. Must be one of: ${ALLOWED_AI_PROVIDERS.join(', ')}`,
    );
  }
  const primaryType = rawPrimary as AIProviderId;

  const fallbackType = options?.fallback;
  const allowDevFallback =
    options?.allowDevFallback ?? process.env.AI_DEV_FALLBACK_TO_MOCK === 'true';
  const hasFallback = fallbackType === 'mock' || allowDevFallback;

  const createProviderInstance = (type: AIProviderId): AIProvider => {
    switch (type) {
      case 'anthropic': {
        const apiKey = options?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '';
        if (!apiKey && !hasFallback) {
          throw new Error('ANTHROPIC_API_KEY is not configured.');
        }
        const model = options?.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
        if (
          !ALLOWED_ANTHROPIC_MODELS.includes(model as (typeof ALLOWED_ANTHROPIC_MODELS)[number])
        ) {
          throw new Error(
            `Invalid Anthropic model '${model}'. Allowed models: ${ALLOWED_ANTHROPIC_MODELS.join(', ')}`,
          );
        }
        return new AnthropicProvider({
          apiKey,
          model,
          timeoutMs: options?.timeoutMs,
          externalAiEnabled: options?.externalAiEnabled,
        });
      }
      case 'gemini': {
        const apiKey = options?.geminiApiKey || process.env.GEMINI_API_KEY || '';
        if (!apiKey && !hasFallback) {
          throw new Error('GEMINI_API_KEY is not configured.');
        }
        const model = options?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        if (!ALLOWED_GEMINI_MODELS.includes(model as (typeof ALLOWED_GEMINI_MODELS)[number])) {
          throw new Error(
            `Invalid Gemini model '${model}'. Allowed models: ${ALLOWED_GEMINI_MODELS.join(', ')}`,
          );
        }
        return new GeminiProvider({
          apiKey,
          model,
          timeoutMs: options?.timeoutMs,
          externalAiEnabled: options?.externalAiEnabled,
        });
      }
      case 'mock':
      default:
        return new MockProvider();
    }
  };

  const primary = createProviderInstance(primaryType);
  if (primaryType === 'mock') {
    return primary;
  }

  if (hasFallback) {
    const fallback = new MockProvider();
    return new FallbackProviderWrapper(primary, fallback);
  }

  return primary;
}
