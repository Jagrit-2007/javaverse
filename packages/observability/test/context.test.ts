import { describe, it, expect } from 'vitest';
import { generateCorrelationId, runWithCorrelationContext, getCorrelationId } from '../src/context';

describe('Correlation Context', () => {
  it('generates valid UUIDv4 correlation IDs', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('preserves correlation ID within asynchronous context', async () => {
    const expectedId = generateCorrelationId();
    await runWithCorrelationContext({ correlationId: expectedId }, async () => {
      await new Promise((r) => setTimeout(r, 10));
      expect(getCorrelationId()).toBe(expectedId);
    });
  });
});
