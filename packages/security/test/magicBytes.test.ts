import { describe, it, expect } from 'vitest';
import { inspectFileBuffer, sanitizeFileName } from '../src/magicBytes';
import { SecurityValidationError } from '../src/errors';

describe('Magic Bytes & File Inspection', () => {
  it('identifies PNG files accurately by magic bytes', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const info = inspectFileBuffer(pngHeader, 'image.png');
    expect(info.mimeType).toBe('image/png');
    expect(info.extension).toBe('png');
  });

  it('identifies JPEG files accurately by magic bytes', () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const info = inspectFileBuffer(jpegHeader, 'photo.jpg');
    expect(info.mimeType).toBe('image/jpeg');
    expect(info.extension).toBe('jpg');
  });

  it('identifies PDF files accurately by magic bytes', () => {
    const pdfHeader = Buffer.from('%PDF-1.7\n%test');
    const info = inspectFileBuffer(pdfHeader, 'document.pdf');
    expect(info.mimeType).toBe('application/pdf');
    expect(info.extension).toBe('pdf');
  });

  it('identifies Java source files and plain text', () => {
    const javaCode = Buffer.from('public class Main { public static void main(String[] args) {} }');
    const info = inspectFileBuffer(javaCode, 'Main.java');
    expect(info.mimeType).toBe('text/x-java-source');
    expect(info.extension).toBe('java');
  });

  it('strictly rejects SVG uploads to prevent stored XSS', () => {
    const svgContent = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(() => inspectFileBuffer(svgContent, 'graphic.svg')).toThrow(SecurityValidationError);
    expect(() => inspectFileBuffer(svgContent, 'graphic.png')).toThrow(SecurityValidationError);
  });

  it('rejects files larger than 5 MB', () => {
    const huge = Buffer.alloc(5 * 1024 * 1024 + 1);
    expect(() => inspectFileBuffer(huge, 'big.png')).toThrow(SecurityValidationError);
  });

  it('sanitizes unsafe file names', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('test file (1).java')).toBe('test_file__1_.java');
  });
});
