import { NextRequest } from 'next/server';
import { prisma } from '@javaverse/db';
import { requireOwnerAuth } from '@/lib/adminAuth';
import { jsonOk, jsonError } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAuth(request);
  if (!auth.ok) {
    return jsonError(auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const candidates = await prisma.kbCandidate.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        analysis: {
          select: {
            id: true,
            modelId: true,
            verificationStatus: true,
            createdAt: true,
          },
        },
      },
    });

    return jsonOk({ candidates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list candidates';
    return jsonError('INTERNAL_ERROR', message, 500);
  }
}
