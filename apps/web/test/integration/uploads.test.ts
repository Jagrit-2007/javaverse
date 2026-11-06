import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@javaverse/db';
import { POST as handleUpload } from '@/app/api/v1/uploads/route';
import { GET as handleGetContent } from '@/app/api/v1/uploads/[id]/content/route';
import { POST as handleMessage } from '@/app/api/v1/chats/[id]/messages/route';
import { NextRequest } from 'next/server';
import { generateSessionTokens, createSessionRow, SESSION_COOKIE_NAME } from '@/lib/auth';
import { generateSessionCsrfToken } from '@javaverse/security';
import { getServerKeys } from '@/lib/keys';
import { processMediaScanJob } from '../../../../apps/worker/src/processors/mediaProcessor';
import { createChatInFirstFreeSlot } from '@/lib/chats';

function createMultipartBody(
  fieldName: string,
  fileName: string,
  contentType: string,
  content: Buffer | string,
  boundary = '----TestBoundary' + Math.random().toString(36).substring(2),
) {
  const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([header, contentBuf, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

describe('Upload Quarantine & Media Security Integration', () => {
  let userId: string;
  let rawSessionToken: string;
  let sessionPublicId: string;
  let csrfToken: string;

  beforeEach(async () => {
    await prisma.attachment.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: `upload-tester-${Math.random().toString(36).substring(2)}@example.com`,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    });
    userId = user.id;

    const tokens = generateSessionTokens();
    rawSessionToken = tokens.rawToken;
    sessionPublicId = tokens.publicId;

    await createSessionRow({
      userId,
      tokenDigest: tokens.tokenDigest,
      publicId: tokens.publicId,
    });

    const keys = getServerKeys();
    csrfToken = generateSessionCsrfToken(sessionPublicId, keys.csrfHmacKey);
  });

  afterEach(async () => {
    await prisma.attachment.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  });

  it('strictly rejects SVG uploads with 400 to prevent stored XSS attacks', async () => {
    const multipart = createMultipartBody(
      'file',
      'exploit.svg',
      'image/svg+xml',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );

    const req = new NextRequest('http://localhost:3000/api/v1/uploads', {
      method: 'POST',
      body: multipart.body,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}`,
        'x-csrf-token': csrfToken,
        origin: 'http://localhost:3000',
        'content-type': multipart.contentType,
      },
    });

    const res = await handleUpload(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('INVALID_FILE');
    expect(body.error.message).toContain('SVG uploads are strictly prohibited');
  });

  it('quarantines valid PNG upload, blocks access while PENDING, and serves safely after clean scan', async () => {
    // 1. Create a minimal 1x1 valid PNG
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const multipart = createMultipartBody('file', 'screenshot.png', 'image/png', pngBuffer);

    const uploadReq = new NextRequest('http://localhost:3000/api/v1/uploads', {
      method: 'POST',
      body: multipart.body,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}`,
        'x-csrf-token': csrfToken,
        origin: 'http://localhost:3000',
        'content-type': multipart.contentType,
      },
    });

    const uploadRes = await handleUpload(uploadReq);
    expect(uploadRes.status).toBe(201);
    const uploadBody = await uploadRes.json();
    const attachment = uploadBody.data.attachment;
    expect(attachment.id).toBeDefined();
    expect(attachment.scanStatus).toBe('PENDING');

    // 2. Accessing content while PENDING must return 423 Locked (quarantined)
    const contentReq1 = new NextRequest(
      `http://localhost:3000/api/v1/uploads/${attachment.id}/content`,
      {
        method: 'GET',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}` },
      },
    );
    const contentRes1 = await handleGetContent(contentReq1, {
      params: Promise.resolve({ id: attachment.id }),
    });
    expect(contentRes1.status).toBe(423);
    const body1 = await contentRes1.json();
    expect(body1.error.code).toBe('FILE_QUARANTINED');

    // 3. Run worker media scan & sanitization
    const dbAttachment = await prisma.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
    });
    await processMediaScanJob({
      data: {
        attachmentId: dbAttachment.id,
        storageKey: dbAttachment.storageKey,
        mimeType: dbAttachment.mimeType,
        userId,
      },
    } as any);

    // 4. Verify DB status is now CLEAN
    const updatedAttachment = await prisma.attachment.findUniqueOrThrow({
      where: { id: attachment.id },
    });
    expect(updatedAttachment.scanStatus).toBe('CLEAN');
    expect(updatedAttachment.mimeType).toBe('image/webp');

    // 5. Accessing content after clean scan streams safely with nosniff and download disposition
    const contentReq2 = new NextRequest(
      `http://localhost:3000/api/v1/uploads/${attachment.id}/content`,
      {
        method: 'GET',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}` },
      },
    );
    const contentRes2 = await handleGetContent(contentReq2, {
      params: Promise.resolve({ id: attachment.id }),
    });
    expect(contentRes2.status).toBe(200);
    expect(contentRes2.headers.get('content-type')).toBe('image/webp');
    expect(contentRes2.headers.get('x-content-type-options')).toBe('nosniff');
    expect(contentRes2.headers.get('content-disposition')).toContain('attachment;');
  });

  it('links uploaded attachments to chat messages and enforces 3-attachment limit', async () => {
    // Create 4 dummy clean attachments
    const atts = [];
    for (let i = 0; i < 4; i++) {
      const att = await prisma.attachment.create({
        data: {
          userId,
          storageKey: `key-${i}-${crypto.randomUUID()}`,
          originalFileName: `file${i}.java`,
          safeDisplayName: `file${i}.java`,
          mimeType: 'text/x-java-source',
          sizeBytes: BigInt(100),
          sha256: `hash-${i}`,
          scanStatus: 'CLEAN',
        },
      });
      atts.push(att);
    }

    const chat = await createChatInFirstFreeSlot(userId, 'Test Question');

    // Attempting to attach 4 attachments must be rejected
    const reqFail = new NextRequest(`http://localhost:3000/api/v1/chats/${chat.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Check these files',
        attachmentIds: atts.map((a) => a.id),
      }),
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}`,
        'x-csrf-token': csrfToken,
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
    });
    const resFail = await handleMessage(reqFail, { params: Promise.resolve({ id: chat.id }) });
    expect(resFail.status).toBe(400);

    // Attaching 2 attachments succeeds and associates them in DB
    const reqSuccess = new NextRequest(`http://localhost:3000/api/v1/chats/${chat.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Check these 2 files',
        attachmentIds: [atts[0]!.id, atts[1]!.id],
      }),
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${rawSessionToken}`,
        'x-csrf-token': csrfToken,
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
    });
    const resSuccess = await handleMessage(reqSuccess, {
      params: Promise.resolve({ id: chat.id }),
    });
    expect(resSuccess.status).toBe(202);

    const linkedAtts = await prisma.attachment.findMany({
      where: { id: { in: [atts[0]!.id, atts[1]!.id] } },
    });
    expect(linkedAtts[0]?.messageId).toBeDefined();
    expect(linkedAtts[1]?.messageId).toBeDefined();
  });
});
