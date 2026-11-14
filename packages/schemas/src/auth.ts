import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .trim()
  .max(64, 'Display name must not exceed 64 characters')
  .refine(
    (val) => !/[\x00-\x1F\x7F-\x9F]/.test(val),
    'Display name must not contain control characters',
  );

export const passwordWhitespaceRegex = /^\s|\s$/;

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Password cannot exceed 128 characters.')
  .refine(
    (val) => !passwordWhitespaceRegex.test(val),
    'Password cannot begin or end with whitespace.',
  );

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

export const signupSchema = z
  .object({
    displayName: displayNameSchema.optional().or(z.literal('')),
    email: z.string().trim().email('Invalid email address').max(254),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const mfaChallengeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export const mfaRecoverySchema = z.object({
  recoveryCode: z.string().trim().min(1, 'Recovery code is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const reauthSchema = z.object({
  password: z.string().min(1, 'Password is required').max(128),
});
