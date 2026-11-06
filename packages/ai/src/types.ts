import type { PedagogicalAnalysis } from '@javaverse/schemas';

export interface AnalysisAttachment {
  fileName: string;
  mimeType: string;
  content: string;
}

export interface AnalysisRequest {
  prompt: string;
  codeSnippet?: string;
  javaVersion?: string;
  topic?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EASY' | 'MEDIUM' | 'HARD';
  attachments?: AnalysisAttachment[];
  correlationId?: string;
}

export interface AnalysisResponse {
  modelId: string;
  promptVersion: string;
  result: PedagogicalAnalysis;
  rawResponse?: string;
}

export interface AIProvider {
  readonly providerId: 'mock' | 'anthropic' | 'gemini';
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
}

export type { PedagogicalAnalysis };
