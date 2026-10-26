export interface AnalysisRequest {
  prompt: string;
  codeSnippet?: string;
  javaVersion?: string;
}

export interface AnalysisResponse {
  modelId: string;
  promptVersion: string;
  explanation: string;
  codeSolution?: string;
  complexity?: {
    time: string;
    space: string;
  };
  visualizations?: Array<{
    type: string;
    spec: Record<string, unknown>;
  }>;
}

export interface AIProvider {
  readonly providerId: string;
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
}
