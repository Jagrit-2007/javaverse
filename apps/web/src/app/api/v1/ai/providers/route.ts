import { NextRequest } from 'next/server';
import { extractSessionCookie, resolveSession } from '@/lib/auth';
import { jsonOk, jsonError } from '@/lib/apiResponse';
import { env } from '@/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sessionToken = extractSessionCookie(request);
  const auth = await resolveSession(sessionToken);

  if (!auth) {
    return jsonError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const externalAiEnabled = Boolean(env.EXTERNAL_AI_ENABLED);
  const geminiConfigured = Boolean(externalAiEnabled && env.GEMINI_API_KEY);
  const anthropicConfigured = Boolean(externalAiEnabled && env.ANTHROPIC_API_KEY);

  let activeModel = 'javaverse-local-mock';
  if (env.AI_PROVIDER_PRIMARY === 'gemini') {
    activeModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
  } else if (env.AI_PROVIDER_PRIMARY === 'anthropic') {
    activeModel = env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  }

  return jsonOk({
    activeProvider: env.AI_PROVIDER_PRIMARY,
    activeModel,
    externalAiEnabled,
    providers: [
      {
        id: 'mock',
        label: 'Local Mock',
        configured: true,
        external: false,
        mayConsumePaidUsage: false,
      },
      {
        id: 'gemini',
        label: 'Gemini',
        configured: geminiConfigured,
        external: true,
        mayConsumePaidUsage: true,
      },
      {
        id: 'anthropic',
        label: 'Anthropic',
        configured: anthropicConfigured,
        external: true,
        mayConsumePaidUsage: true,
      },
    ],
  });
}
