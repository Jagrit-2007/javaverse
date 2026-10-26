import type { AIProvider, AnalysisRequest, AnalysisResponse } from '../types';

export class MockProvider implements AIProvider {
  public readonly providerId = 'mock';

  async analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
    return {
      modelId: 'mock-model-v1',
      promptVersion: 'v1.0.0',
      explanation: `Mock analysis response for prompt: "${request.prompt}"`,
      codeSolution: `public class Solution {\n    public static void main(String[] args) {\n        System.out.println("JavaVerse Mock Solution");\n    }\n}`,
      complexity: {
        time: 'O(1)',
        space: 'O(1)',
      },
      visualizations: [],
    };
  }
}
