export interface AiAnalysisResult {
  transcription: string;
  summary: string;
  speakers: string[];
  tags: string[];
}

export interface AnalysisResult {
  success: boolean;
  fileName: string;
  converted: boolean;
  mediaInfo: unknown; // MediaInfo output can be complex.
  bwfInfo: string | null;
  mediaConchReport: string | null;
  aiAnalysis: AiAnalysisResult | null;
}
