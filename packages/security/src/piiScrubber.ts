/**
 * PII and Sensitive Data Scrubber for JavaVerse Knowledge Base Pipeline
 *
 * Anonymizes learner prompts, submissions, and code explanations before
 * promoting them to Knowledge Base candidates or evaluation datasets.
 */

export interface ScrubResult {
  text: string;
  redactionCount: number;
  categories: string[];
}

// Regex patterns for sensitive identifiers
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// IPv4: match valid dotted-quads that are not version strings (octets 0-255)
const IPV4_REGEX =
  /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

// IPv6 (simplified standard representations)
const IPV6_REGEX =
  /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:[0-9a-fA-F]{1,4}\b/g;

// URLs (http/https and git/ssh) - without trailing sentence punctuation
const URL_REGEX = /\b(?:https?|ftp|git):\/\/[^\s<>"'{}|\\^`]+[^\s<>"'{}|\\^`.,;:!?]/g;

// Phone numbers (North American and international formats, min 10 digits)
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

// File system paths indicating private directories
const PATH_REGEX =
  /(?:\/(?:home|Users|root|private|var|etc)\/[^\s:;,"'<>]+|[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\s:;,"'<>]+)/gi;

// Tokens and API keys: JWTs, hex hashes >= 32 chars, or Bearer auth
const JWT_REGEX = /\beyJ[a-zA-Z0-9_\-]{8,}\.eyJ[a-zA-Z0-9_\-]{8,}\.[a-zA-Z0-9_\-]{8,}\b/g;
const SECRET_KEY_REGEX =
  /\b(?:sk-[a-zA-Z0-9_\-]{20,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|[0-9a-fA-F]{40,64})\b/g;
const AUTH_HEADER_REGEX = /\bBearer\s+[a-zA-Z0-9_\-\.]{16,}\b/gi;

// Salutations / Name introductions
const INTRO_NAME_REGEX =
  /\b(?:my name is|i am|i'm|author:|signed:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;
const SIGN_OFF_NAME_REGEX =
  /\b(?:thanks,|regards,|sincerely,|cheers,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;

export function scrubPii(input: string): ScrubResult {
  if (!input) {
    return { text: '', redactionCount: 0, categories: [] };
  }

  let text = input;
  let count = 0;
  const categories = new Set<string>();

  // 1. Scrub JWTs and Secrets first
  if (JWT_REGEX.test(text)) {
    categories.add('TOKEN');
    text = text.replace(JWT_REGEX, () => {
      count++;
      return '[REDACTED_TOKEN]';
    });
  }

  if (SECRET_KEY_REGEX.test(text)) {
    categories.add('SECRET');
    text = text.replace(SECRET_KEY_REGEX, () => {
      count++;
      return '[REDACTED_SECRET]';
    });
  }

  if (AUTH_HEADER_REGEX.test(text)) {
    categories.add('SECRET');
    text = text.replace(AUTH_HEADER_REGEX, () => {
      count++;
      return 'Bearer [REDACTED_SECRET]';
    });
  }

  // 2. Scrub Emails
  if (EMAIL_REGEX.test(text)) {
    categories.add('EMAIL');
    text = text.replace(EMAIL_REGEX, () => {
      count++;
      return '[REDACTED_EMAIL]';
    });
  }

  // 3. Scrub URLs
  if (URL_REGEX.test(text)) {
    categories.add('URL');
    text = text.replace(URL_REGEX, () => {
      count++;
      return '[REDACTED_URL]';
    });
  }

  // 4. Scrub File Paths
  if (PATH_REGEX.test(text)) {
    categories.add('PATH');
    text = text.replace(PATH_REGEX, () => {
      count++;
      return '[REDACTED_PATH]';
    });
  }

  // 5. Scrub Phone Numbers
  if (PHONE_REGEX.test(text)) {
    categories.add('PHONE');
    text = text.replace(PHONE_REGEX, () => {
      count++;
      return '[REDACTED_PHONE]';
    });
  }

  // 6. Scrub IP Addresses
  if (IPV4_REGEX.test(text)) {
    categories.add('IP');
    text = text.replace(IPV4_REGEX, () => {
      count++;
      return '[REDACTED_IP]';
    });
  }

  if (IPV6_REGEX.test(text)) {
    categories.add('IP');
    text = text.replace(IPV6_REGEX, () => {
      count++;
      return '[REDACTED_IP]';
    });
  }

  // 7. Scrub Name introductions
  if (INTRO_NAME_REGEX.test(text)) {
    categories.add('NAME');
    text = text.replace(INTRO_NAME_REGEX, (match, name) => {
      count++;
      return match.replace(name, '[REDACTED_NAME]');
    });
  }

  if (SIGN_OFF_NAME_REGEX.test(text)) {
    categories.add('NAME');
    text = text.replace(SIGN_OFF_NAME_REGEX, (match, name) => {
      count++;
      return match.replace(name, '[REDACTED_NAME]');
    });
  }

  return {
    text,
    redactionCount: count,
    categories: Array.from(categories),
  };
}
