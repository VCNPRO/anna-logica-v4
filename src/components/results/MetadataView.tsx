import { AnalysisResult } from "@/lib/types";
import { useTranslations } from 'next-intl';

export function MetadataView({ result }: { result: AnalysisResult }) {
  const t = useTranslations('MetadataView');
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{t('title')}</h3>
      <div className="text-sm text-gray-700 space-y-3">
        <p><strong className="text-gray-900">{t('fileNameLabel')}</strong> {result.fileName}</p>
        <p><strong className="text-gray-900">{t('convertedToMp3Label')}</strong> {result.converted ? t('yes') : t('no')}</p>

        {result.mediaConchReport && (
            <>
                <h4 className="text-base font-semibold pt-4 text-gray-900">{t('mediaConchReportLabel')}</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto border border-gray-200 text-gray-700">{result.mediaConchReport}</pre>
            </>
        )}

        {result.bwfInfo && result.bwfInfo !== "File is not a BWF file or analysis failed." && (
            <>
                <h4 className="text-base font-semibold pt-4 text-gray-900">{t('bwfReportLabel')}</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto border border-gray-200 text-gray-700">{result.bwfInfo}</pre>
            </>
        )}

        {Boolean(result.mediaInfo) && (
            <>
                <h4 className="text-base font-semibold pt-4 text-gray-900">{t('mediaInfoReportLabel')}</h4>
                <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto border border-gray-200 text-gray-700">{JSON.stringify(result.mediaInfo as object, null, 2)}</pre>
            </>
        )}
      </div>
    </div>
  );
}
