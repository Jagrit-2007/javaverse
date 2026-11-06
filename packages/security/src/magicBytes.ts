import crypto from 'node:crypto';
import { SecurityValidationError } from './errors';

export interface InspectedFileType {
  mimeType: string;
  extension: string;
  sha256: string;
  byteSize: number;
}

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/x-java-source',
  'text/plain',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function sanitizeFileName(fileName: string): string {
  // Strip directory traversal
  const base = fileName.split(/[/\\]/).pop() || 'upload';
  // Replace spaces with underscores and remove dangerous characters
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
  return sanitized.length > 0 ? sanitized : 'upload';
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function inspectFileBuffer(buffer: Buffer, originalFileName: string): InspectedFileType {
  const byteSize = buffer.length;
  const sha256 = computeSha256(buffer);

  if (byteSize === 0) {
    throw new SecurityValidationError('File is empty.');
  }

  if (byteSize > 5 * 1024 * 1024) {
    throw new SecurityValidationError('File exceeds maximum allowed size of 5 MB.');
  }

  // 1. Strict SVG detection and rejection (stored XSS prevention)
  const headerPreview = buffer.slice(0, 2048).toString('utf8').toLowerCase();
  if (
    headerPreview.includes('<svg') ||
    headerPreview.includes('xmlns="http://www.w3.org/2000/svg"') ||
    headerPreview.includes('<!doctype svg') ||
    originalFileName.toLowerCase().endsWith('.svg')
  ) {
    throw new SecurityValidationError('SVG uploads are strictly prohibited for security reasons.');
  }

  // 2. Magic byte signatures
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png', sha256, byteSize };
  }

  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg', sha256, byteSize };
  }

  // WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp', sha256, byteSize };
  }

  // PDF: %PDF- (bytes 0-4: 25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { mimeType: 'application/pdf', extension: 'pdf', sha256, byteSize };
  }

  // Text / Java source: verify valid UTF-8 without control bytes
  const isText = isUtf8Text(buffer);
  if (isText) {
    const ext = originalFileName.toLowerCase().endsWith('.java') ? 'java' : 'txt';
    const mime = ext === 'java' ? 'text/x-java-source' : 'text/plain';
    return { mimeType: mime, extension: ext, sha256, byteSize };
  }

  throw new SecurityValidationError(
    'Unsupported file format. Allowed types: PNG, JPEG, WebP, PDF, Java source (.java), plain text (.txt).',
  );
}

function isUtf8Text(buffer: Buffer): boolean {
  // Reject null bytes and binary control codes (except \t, \n, \r)
  const checkLength = Math.min(buffer.length, 4096);
  for (let i = 0; i < checkLength; i++) {
    const b = buffer[i];
    if (b === 0) return false;
    if (b !== undefined && b < 0x09 && b !== 0x00) return false;
    if (b !== undefined && b > 0x0d && b < 0x20) return false;
  }
  return true;
}
