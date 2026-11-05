import { z } from 'zod';

export const displayNameSchema = z
  .string()
  .trim()
  .max(64, 'Display name must not exceed 64 characters')
  .refine(
    (val) => !/[\x00-\x1F\x7F-\x9F]/.test(val),
    'Display name must not contain control characters',
  );

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

export const bootstrapValidateSchema = z.object({
  token: z.string().min(1, 'Bootstrap token is required'),
});

export const bootstrapFinalizeSchema = z.object({
  ticketId: z.string().min(1, 'Enrollment ticket ID is required'),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
  displayName: displayNameSchema.optional(),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

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
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'New password must be at least 12 characters')
    .max(128, 'New password must not exceed 128 characters'),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  role: z.enum(['MEMBER']).default('MEMBER'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  displayName: displayNameSchema.optional(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const reauthSchema = z.object({
  password: z.string().min(1, 'Password is required').max(128),
});
