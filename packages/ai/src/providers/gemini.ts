import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';
import { createPromptEnvelope } from '../prompts/delimiters';
import { PedagogicalAnalysisSchema } from '@javaverse/schemas';

export interface GeminiProviderOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number | undefined;
  externalAiEnabled?: boolean | undefined;
}

export class GeminiProvider implements AIProvider {
  public readonly providerId = 'gemini' as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly externalAiEnabled: boolean;

  constructor(options?: GeminiProviderOptions) {
    this.apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.model = options?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = options?.timeoutMs ?? 30000;
    this.externalAiEnabled =
      options?.externalAiEnabled ?? (process.env.EXTERNAL_AI_ENABLED === 'false' ? false : true);
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    if (!this.externalAiEnabled) {
      throw new Error('External AI is disabled in server configuration.');
    }
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const envelope = createPromptEnvelope(request.prompt, {
      ...(request.codeSnippet ? { codeSnippet: request.codeSnippet } : {}),
      ...(request.javaVersion ? { javaVersion: request.javaVersion } : {}),
      ...(request.attachments ? { attachments: request.attachments } : {}),
    });

    // Send API key via x-goog-api-key header; never include in URL query parameters
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: envelope.systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: envelope.userPrompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      const isTimeout =
        (err instanceof Error && err.name === 'TimeoutError') ||
        (err instanceof DOMException && err.name === 'TimeoutError');
      if (isTimeout) {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      const sanitized = this.apiKey ? rawMsg.replaceAll(this.apiKey, '[REDACTED]') : rawMsg;
      throw new Error(`Gemini network error: ${sanitized}`);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const sanitized = this.apiKey ? errBody.replaceAll(this.apiKey, '[REDACTED]') : errBody;
      throw new Error(`Gemini API error (${res.status}): ${sanitized}`);
    }

    let parsedObj: unknown;
    let usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
    } | null = null;
    try {
      const data = await res.json();
      if (data?.usageMetadata) {
        usage = {
          inputTokens:
            typeof data.usageMetadata.promptTokenCount === 'number'
              ? data.usageMetadata.promptTokenCount
              : null,
          outputTokens:
            typeof data.usageMetadata.candidatesTokenCount === 'number'
              ? data.usageMetadata.candidatesTokenCount
              : null,
          totalTokens:
            typeof data.usageMetadata.totalTokenCount === 'number'
              ? data.usageMetadata.totalTokenCount
              : null,
        };
      }
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';

      const cleanJson = text
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      parsedObj = JSON.parse(cleanJson);
    } catch (err: unknown) {
      throw new Error(
        `Malformed AI provider response: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parseResult = PedagogicalAnalysisSchema.safeParse(parsedObj);
    if (!parseResult.success) {
      throw new Error(`Malformed AI provider response schema: ${parseResult.error.message}`);
    }

    return {
      providerId: this.providerId,
      modelId: this.model,
      promptVersion: '1.0.0',
      result: parseResult.data,
      rawResponse: typeof parsedObj === 'object' ? JSON.stringify(parsedObj) : '',
      usage,
    };
  }
}
