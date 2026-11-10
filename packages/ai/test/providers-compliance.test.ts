import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAIProvider,
  ALLOWED_AI_PROVIDERS,
  ALLOWED_GEMINI_MODELS,
  ALLOWED_ANTHROPIC_MODELS,
  MockProvider,
  GeminiProvider,
  AnthropicProvider,
} from '../src';

describe('Part 11 & Part 14: AI Providers, Models, Tokens, and Privacy Compliance', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Mock mode requires no API key, performs no external fetch, and reports zero token usage', async () => {
    expect(ALLOWED_AI_PROVIDERS).toContain('mock');
    expect(ALLOWED_GEMINI_MODELS).toContain('gemini-2.5-flash');
    expect(ALLOWED_ANTHROPIC_MODELS).toContain('claude-3-5-sonnet-20241022');

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const provider = new MockProvider();
    expect(provider.providerId).toBe('mock');

    const response = await provider.analyze({ prompt: 'Implement binary search in Java' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.providerId).toBe('mock');
    expect(response.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
    expect(response.result).toBeDefined();
  });

  it('2. Explicit Gemini selection without GEMINI_API_KEY fails clearly', async () => {
    expect(() =>
      getAIProvider({
        primary: 'gemini',
        geminiApiKey: '',
        externalAiEnabled: true,
      }),
    ).toThrow('GEMINI_API_KEY is not configured');

    const gemini = new GeminiProvider({ apiKey: '' });
    await expect(gemini.analyze({ prompt: 'Test' })).rejects.toThrow(
      'GEMINI_API_KEY is not configured',
    );
  });

  it('3. Explicit Anthropic selection without ANTHROPIC_API_KEY fails clearly', async () => {
    expect(() =>
      getAIProvider({
        primary: 'anthropic',
        anthropicApiKey: '',
        externalAiEnabled: true,
      }),
    ).toThrow('ANTHROPIC_API_KEY is not configured');

    const anthropic = new AnthropicProvider({ apiKey: '' });
    await expect(anthropic.analyze({ prompt: 'Test' })).rejects.toThrow(
      'ANTHROPIC_API_KEY is not configured',
    );
  });

  it('4. Gemini API key appears only in x-goog-api-key header and never in URL', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        schemaVersion: 1,
                        meta: {
                          topic: 'Core Java',
                          subtopics: [],
                          difficulty: 'EASY',
                          questionType: 'CODING',
                          javaVersion: '21',
                          confidence: 1,
                        },
                        understanding: {
                          restatement: 'Problem',
                          inputs: [],
                          outputs: [],
                          constraints: [],
                          examples: [],
                          edgeCases: [],
                          assumptions: [],
                        },
                        prerequisites: [],
                        approaches: [
                          { name: 'A', idea: 'B', time: 'O(1)', space: 'O(1)', recommended: true },
                        ],
                        solution: { code: 'class Solution {}' },
                        visualizations: [],
                        pitfalls: [],
                        followUps: [],
                        relatedLessons: [],
                        practice: [],
                      }),
                    },
                  ],
                },
              },
            ],
            usageMetadata: {
              promptTokenCount: 120,
              candidatesTokenCount: 45,
              totalTokenCount: 165,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const testKey = 'test-secret-gemini-key-12345';
    const provider = new GeminiProvider({ apiKey: testKey, model: 'gemini-2.5-flash' });
    const res = await provider.analyze({ prompt: 'Test question' });

    expect(capturedUrl).not.toContain(testKey);
    expect(capturedHeaders['x-goog-api-key']).toBe(testKey);
    expect(res.usage).toEqual({
      inputTokens: 120,
      outputTokens: 45,
      totalTokens: 165,
    });
  });

  it('5. Anthropic API key appears only in x-api-key header and never in URL', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return Promise.resolve(
        new Response(
          JSON.stringify({
            content: [
              {
                text: JSON.stringify({
                  schemaVersion: 1,
                  meta: {
                    topic: 'Core Java',
                    subtopics: [],
                    difficulty: 'EASY',
                    questionType: 'CODING',
                    javaVersion: '21',
                    confidence: 1,
                  },
                  understanding: {
                    restatement: 'Problem',
                    inputs: [],
                    outputs: [],
                    constraints: [],
                    examples: [],
                    edgeCases: [],
                    assumptions: [],
                  },
                  prerequisites: [],
                  approaches: [
                    { name: 'A', idea: 'B', time: 'O(1)', space: 'O(1)', recommended: true },
                  ],
                  solution: { code: 'class Solution {}' },
                  visualizations: [],
                  pitfalls: [],
                  followUps: [],
                  relatedLessons: [],
                  practice: [],
                }),
              },
            ],
            usage: {
              input_tokens: 250,
              output_tokens: 110,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const testKey = 'test-secret-anthropic-key-67890';
    const provider = new AnthropicProvider({
      apiKey: testKey,
      model: 'claude-3-5-sonnet-20241022',
    });
    const res = await provider.analyze({ prompt: 'Test question' });

    expect(capturedUrl).not.toContain(testKey);
    expect(capturedHeaders['x-api-key']).toBe(testKey);
    expect(res.usage).toEqual({
      inputTokens: 250,
      outputTokens: 110,
      totalTokens: 360,
    });
  });

  it('6. Rejects unallowlisted models and invalid providers', () => {
    expect(() =>
      getAIProvider({
        primary: 'unsupported-provider',
      }),
    ).toThrow("Invalid AI provider 'unsupported-provider'");

    expect(() =>
      getAIProvider({
        primary: 'gemini',
        geminiApiKey: 'test-key',
        model: 'arbitrary-gpt-model',
      }),
    ).toThrow('Invalid Gemini model');

    expect(() =>
      getAIProvider({
        primary: 'anthropic',
        anthropicApiKey: 'test-key',
        model: 'arbitrary-claude-model',
      }),
    ).toThrow('Invalid Anthropic model');
  });

  it('7. When external AI is disabled, external providers reject execution without external fetch', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const gemini = new GeminiProvider({
      apiKey: 'test-key',
      externalAiEnabled: false,
    });
    await expect(gemini.analyze({ prompt: 'Test' })).rejects.toThrow(
      'External AI is disabled in server configuration',
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    const anthropic = new AnthropicProvider({
      apiKey: 'test-key',
      externalAiEnabled: false,
    });
    await expect(anthropic.analyze({ prompt: 'Test' })).rejects.toThrow(
      'External AI is disabled in server configuration',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('8. Development fallback explicitly labels response as mock and records fallback reason', async () => {
    const provider = getAIProvider({
      primary: 'gemini',
      geminiApiKey: 'invalid-key',
      allowDevFallback: true,
      externalAiEnabled: true,
    });

    // Mock fetch to simulate failure
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await provider.analyze({ prompt: 'Test prompt' });
    expect(res.providerId).toBe('mock');
    expect(res.fallbackUsed).toBe(true);
    expect(res.fallbackReason).toBe(
      'External provider unavailable. Showing a Local Mock response.',
    );
  });
});
