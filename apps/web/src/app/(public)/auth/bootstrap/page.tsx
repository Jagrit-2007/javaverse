'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '../Auth.module.css';

type Step = 'TOKEN' | 'DETAILS_AND_MFA' | 'RECOVERY_CODES';

export default function BootstrapPage() {
  const [step, setStep] = useState<Step>('TOKEN');
  const [csrfToken, setCsrfToken] = useState('');
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');

  // Form fields for finalize
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Final recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesConfirmed, setCodesConfirmed] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/csrf?flow=bootstrap')
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.csrfToken) {
          setCsrfToken(data.data.csrfToken);
        }
      })
      .catch(() => {});
  }, []);

  const handleValidateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/bootstrap/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ token: bootstrapToken.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to validate bootstrap token');
        return;
      }

      setTicketId(data.data.ticketId);
      setTotpSecret(data.data.totpSecret);
      setTotpUri(data.data.totpUri);
      setStep('DETAILS_AND_MFA');
    } catch {
      setError('An unexpected error occurred during bootstrap validation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/bootstrap/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          ticketId,
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          totpCode: totpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Failed to complete owner registration');
        return;
      }

      setRecoveryCodes(data.data.recoveryCodes || []);
      setStep('RECOVERY_CODES');
    } catch {
      setError('An unexpected error occurred while creating the owner account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1 className={styles.authTitle}>Workspace Owner Bootstrap</h1>
          <p className={styles.authSubtitle}>
            {step === 'TOKEN' && 'Initialize your JavaVerse instance with your terminal token.'}
            {step === 'DETAILS_AND_MFA' && 'Configure credentials and pair your authenticator app.'}
            {step === 'RECOVERY_CODES' && 'Save your emergency recovery codes in a safe place.'}
          </p>
        </div>

        {error && (
          <div role="alert" className={`${styles.alertBox} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {step === 'TOKEN' && (
          <form onSubmit={handleValidateToken} className={styles.authForm} noValidate>
            <Input
              id="bootstrap-token"
              type="text"
              label="Bootstrap Token"
              description="Enter the 64-character token generated from pnpm bootstrap:owner in your terminal"
              value={bootstrapToken}
              onChange={(e) => setBootstrapToken(e.target.value)}
              required
              disabled={submitting}
              autoComplete="off"
            />

            <Button type="submit" variant="primary" disabled={submitting} fullWidth>
              {submitting ? 'Validating Token...' : 'Validate Token'}
            </Button>
          </form>
        )}

        {step === 'DETAILS_AND_MFA' && (
          <form onSubmit={handleFinalize} className={styles.authForm} noValidate>
            <Input
              id="owner-email"
              type="email"
              label="Owner Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={submitting}
            />

            <Input
              id="owner-name"
              type="text"
              label="Display Name (Optional)"
              description="Max 64 characters. Defaults to 'Owner'."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting}
            />

            <Input
              id="owner-password"
              type="password"
              label="Password"
              description="Minimum 12 characters. Must not be common or compromised."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
            />

            <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <label className={styles.authSubtitle} style={{ fontWeight: 600 }}>
                Authenticator Secret Key (Base32):
              </label>
              <div className={styles.totpSecretDisplay} aria-label="Base32 TOTP Secret">
                {totpSecret}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Add this key to 1Password, Google Authenticator, or Apple Passwords.{' '}
                {totpUri && (
                  <a href={totpUri} className={styles.authLink} style={{ marginLeft: '0.25rem' }}>
                    Open in Authenticator
                  </a>
                )}
              </p>
            </div>

            <Input
              id="owner-totp"
              type="text"
              label="6-Digit TOTP Code"
              description="Enter the 6-digit verification code from your authenticator app"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
              maxLength={6}
              disabled={submitting}
              autoComplete="one-time-code"
            />

            <Button type="submit" variant="primary" disabled={submitting} fullWidth>
              {submitting ? 'Enrolling Owner Account...' : 'Complete Owner Setup'}
            </Button>
          </form>
        )}

        {step === 'RECOVERY_CODES' && (
          <div>
            <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
              Owner account created successfully!
            </div>
            <p className={styles.authSubtitle}>
              These 10 recovery codes are shown <strong>only once</strong>. If you lose access to
              your authenticator device, each code can be used once to regain access.
            </p>

            <div className={styles.recoveryCodesGrid} role="list" aria-label="Recovery Codes">
              {recoveryCodes.map((code) => (
                <div key={code} role="listitem" className={styles.recoveryCodeItem}>
                  {code}
                </div>
              ))}
            </div>

            <div style={{ margin: '1rem 0' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <input
                  id="saved-recovery-codes"
                  type="checkbox"
                  checked={codesConfirmed}
                  onChange={(e) => setCodesConfirmed(e.target.checked)}
                />
                I have safely stored these emergency recovery codes
              </label>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={!codesConfirmed}
              onClick={handleFinish}
              fullWidth
            >
              Enter JavaVerse Dashboard
            </Button>
          </div>
        )}

        <div className={styles.authFooter}>
          <p>
            Already bootstrapped?{' '}
            <Link href="/auth/login" className={styles.authLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
