import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';
import { createPromptEnvelope } from '../prompts/delimiters';
import { PedagogicalAnalysisSchema } from '@javaverse/schemas';

export class GeminiProvider implements AIProvider {
  public readonly providerId = 'gemini' as const;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options?.model || 'gemini-2.5-flash';
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const envelope = createPromptEnvelope(request.prompt, {
      ...(request.codeSnippet ? { codeSnippet: request.codeSnippet } : {}),
      ...(request.javaVersion ? { javaVersion: request.javaVersion } : {}),
      ...(request.attachments ? { attachments: request.attachments } : {}),
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
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
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';

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
