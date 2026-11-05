export function normalizeEmail(rawEmail: string): string {
  if (!rawEmail || typeof rawEmail !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  const trimmed = rawEmail.trim();

  // Reject ASCII control characters and whitespace
  if (/[\x00-\x1F\x7F\s]/.test(trimmed)) {
    throw new Error('Email contains invalid characters or whitespace');
  }

  if (trimmed.length > 254) {
    throw new Error('Email exceeds maximum length of 254 characters');
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    throw new Error('Email must contain exactly one @ symbol');
  }

  const [localPart, domain] = parts;
  if (!localPart || localPart.length > 64) {
    throw new Error('Email local part must be between 1 and 64 characters');
  }

  if (!domain || domain.length < 3) {
    throw new Error('Email domain is too short');
  }

  // Convert internationalized domain name to Punycode via standard URL parser
  let punyDomain = domain.toLowerCase();
  try {
    const dummyUrl = new URL(`http://${domain}`);
    punyDomain = dummyUrl.hostname;
  } catch {
    // If not a valid hostname, proceed with lowercase domain
  }

  return `${localPart.toLowerCase()}@${punyDomain}`;
}

export const canonicalizeEmail = normalizeEmail;
