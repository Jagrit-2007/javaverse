import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';
import { createPromptEnvelope } from '../prompts/delimiters';
import { PedagogicalAnalysisSchema } from '@javaverse/schemas';

export interface AnthropicProviderOptions {
  apiKey?: string | undefined;
  model?: string | undefined;
  timeoutMs?: number | undefined;
}

export class AnthropicProvider implements AIProvider {
  public readonly providerId = 'anthropic' as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options?: AnthropicProviderOptions) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = options?.model || 'claude-3-5-sonnet-20241022';
    this.timeoutMs = options?.timeoutMs ?? 30000;
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const envelope = createPromptEnvelope(request.prompt, {
      ...(request.codeSnippet ? { codeSnippet: request.codeSnippet } : {}),
      ...(request.javaVersion ? { javaVersion: request.javaVersion } : {}),
      ...(request.attachments ? { attachments: request.attachments } : {}),
    });

    let res: Response;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: envelope.systemPrompt,
          messages: [
            {
              role: 'user',
              content: envelope.userPrompt,
            },
          ],
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      const isTimeout =
        (err instanceof Error && err.name === 'TimeoutError') ||
        (err instanceof DOMException && err.name === 'TimeoutError');
      if (isTimeout) {
        throw new Error(`Anthropic request timed out after ${this.timeoutMs}ms`);
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      const sanitized = this.apiKey ? rawMsg.replaceAll(this.apiKey, '[REDACTED]') : rawMsg;
      throw new Error(`Anthropic network error: ${sanitized}`);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const sanitized = this.apiKey ? errBody.replaceAll(this.apiKey, '[REDACTED]') : errBody;
      throw new Error(`Anthropic API error (${res.status}): ${sanitized}`);
    }

    let parsedObj: unknown;
    try {
      const data = await res.json();
      const contentBlock = data.content?.[0];
      const text = contentBlock?.text || '';

      // Strip optional markdown code fence if model wrapped it
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
      modelId: this.model,
      promptVersion: '1.0.0',
      result: parseResult.data,
      rawResponse: typeof parsedObj === 'object' ? JSON.stringify(parsedObj) : '',
    };
  }
}
