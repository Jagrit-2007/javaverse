import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';
import { createPromptEnvelope } from '../prompts/delimiters';
import { PedagogicalAnalysisSchema } from '@javaverse/schemas';

export class AnthropicProvider implements AIProvider {
  public readonly providerId = 'anthropic' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = options?.model || 'claude-3-5-sonnet-20241022';
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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
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
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Anthropic API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const contentBlock = data.content?.[0];
    const text = contentBlock?.text || '';

    // Strip optional markdown code fence if model wrapped it
    const cleanJson = text
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsedObj = JSON.parse(cleanJson);
    const validated = PedagogicalAnalysisSchema.parse(parsedObj);

    return {
      modelId: this.model,
      promptVersion: '1.0.0',
      result: validated,
      rawResponse: text,
    };
  }
}
