import { describe, it, expect } from 'vitest';
import { normalizeEmail } from '../src/email';

describe('Strict Email Canonicalization', () => {
  it('normalizes valid emails by trimming and converting to lowercase', () => {
    expect(normalizeEmail('  Learner@Example.COM  ')).toBe('learner@example.com');
  });

  it('preserves dots and plus addressing without provider-specific stripping', () => {
    expect(normalizeEmail('john.doe+tag@example.com')).toBe('john.doe+tag@example.com');
    expect(normalizeEmail('first.middle.last@gmail.com')).toBe('first.middle.last@gmail.com');
  });

  it('rejects control characters, internal whitespace, and invalid formats', () => {
    expect(() => normalizeEmail('john doe@example.com')).toThrow();
    expect(() => normalizeEmail('john\x00@example.com')).toThrow();
    expect(() => normalizeEmail('no-at-sign.com')).toThrow();
    expect(() => normalizeEmail('@empty-local.com')).toThrow();
    expect(() => normalizeEmail('too-long-local-part-'.repeat(5) + '@example.com')).toThrow();
  });
});
