import { AiAnalysisResult } from "@/lib/types";
import { useTranslations } from 'next-intl';

export function TagsView({ aiAnalysis }: { aiAnalysis: AiAnalysisResult | null }) {
  const t = useTranslations('TagsView');
  if (!aiAnalysis) return null;

  const { speakers, tags } = aiAnalysis;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {speakers.length > 0 && (
        <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">{t('speakersTitle')}</h3>
            <div className="flex flex-wrap gap-2">
                {speakers.map(s => (
                  <span key={s} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                    {s}
                  </span>
                ))}
            </div>
        </div>
      )}
      {tags.length > 0 && (
        <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">{t('tagsTitle')}</h3>
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    #{tag}
                  </span>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
