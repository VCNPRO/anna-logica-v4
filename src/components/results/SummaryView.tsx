import { AiAnalysisResult } from "@/lib/types";
import { useTranslations } from 'next-intl';

export function SummaryView({ aiAnalysis }: { aiAnalysis: AiAnalysisResult | null }) {
  const t = useTranslations('SummaryView');
  if (!aiAnalysis?.summary) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('title')}</h3>
      <p className="text-gray-700 text-base leading-relaxed">{aiAnalysis.summary}</p>
    </div>
  );
}
