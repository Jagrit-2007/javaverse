export function sanitizeReturnUrl(
  url: string | null | undefined,
  defaultUrl = '/dashboard',
): string {
  if (!url || typeof url !== 'string') {
    return defaultUrl;
  }

  const trimmed = url.trim();

  // Reject protocol-relative URLs (//evil.com), backslashes, or control characters
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return defaultUrl;
  }

  // Must only allow paths within /dashboard
  if (!trimmed.startsWith('/dashboard')) {
    return defaultUrl;
  }

  return trimmed;
}
