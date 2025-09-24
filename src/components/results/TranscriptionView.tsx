import { AiAnalysisResult } from "@/lib/types";
import { useTranslations } from 'next-intl';

export function TranscriptionView({ aiAnalysis }: { aiAnalysis: AiAnalysisResult | null }) {
  const t = useTranslations('TranscriptionView');
  if (!aiAnalysis?.transcription) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('title')}</h3>
      <div className="max-h-96 overflow-y-auto text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
        {aiAnalysis.transcription}
      </div>
    </div>
  );
}
