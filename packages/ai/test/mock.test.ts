import { describe, it, expect } from 'vitest';
import { MockProvider } from '../src/providers/mock';

describe('MockProvider', () => {
  it('returns valid analysis response without making network calls', async () => {
    const provider = new MockProvider();
    expect(provider.providerId).toBe('mock');

    const result = await provider.analyze({ prompt: 'How does HashMap work in Java?' });
    expect(result.modelId).toBe('mock-model-v1');
    expect(result.explanation).toContain('How does HashMap work in Java?');
    expect(result.codeSolution).toBeDefined();
  });
});
