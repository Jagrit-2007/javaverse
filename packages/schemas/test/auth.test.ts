import { describe, it, expect } from 'vitest';
import { signupSchema, loginSchema, passwordSchema } from '../src/auth';

describe('Auth Schemas & Password Whitespace Policy', () => {
  const validPassword = 'CorrectHorseBatteryStaple123!';

  it('accepts policy-compliant passwords with internal spaces', () => {
    const pwWithSpaces = 'Correct Horse Battery Staple 123!';
    const result = passwordSchema.safeParse(pwWithSpaces);
    expect(result.success).toBe(true);
  });

  it('rejects passwords with leading whitespace with exact required message', () => {
    const result = passwordSchema.safeParse(` ${validPassword}`);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password cannot begin or end with whitespace.');
    }
  });

  it('rejects passwords with trailing whitespace with exact required message', () => {
    const result = passwordSchema.safeParse(`${validPassword} `);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Password cannot begin or end with whitespace.');
    }
  });

  it('rejects signup with leading or trailing whitespace in password', () => {
    const leading = signupSchema.safeParse({
      displayName: 'Learner',
      email: 'learner@example.com',
      password: ` ${validPassword}`,
      confirmPassword: ` ${validPassword}`,
    });
    expect(leading.success).toBe(false);
    if (!leading.success) {
      expect(leading.error.issues[0]?.message).toBe(
        'Password cannot begin or end with whitespace.',
      );
    }

    const trailing = signupSchema.safeParse({
      displayName: 'Learner',
      email: 'learner@example.com',
      password: `${validPassword} `,
      confirmPassword: `${validPassword} `,
    });
    expect(trailing.success).toBe(false);
    if (!trailing.success) {
      expect(trailing.error.issues[0]?.message).toBe(
        'Password cannot begin or end with whitespace.',
      );
    }
  });

  it('accepts any valid email format in signupSchema and loginSchema', () => {
    const emails = [
      'learner@gmail.com',
      'student@outlook.com',
      'user@my-custom-domain.org',
      'valid.person+tag@sub.example.co.uk',
    ];

    for (const email of emails) {
      const sResult = signupSchema.safeParse({
        email,
        password: validPassword,
        confirmPassword: validPassword,
      });
      expect(sResult.success).toBe(true);

      const lResult = loginSchema.safeParse({
        email,
        password: validPassword,
      });
      expect(lResult.success).toBe(true);
    }
  });

  it('does not modify or trim password in loginSchema', () => {
    const rawPw = ' MyEnteredPassword123! ';
    const parsed = loginSchema.safeParse({
      email: 'learner@example.com',
      password: rawPw,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.password).toBe(rawPw);
    }
  });
});
