import { type AnalysisResult } from '@/lib/types';
import path from 'path';

export function generateTxt(data: AnalysisResult): string {
    let content = `Análisis del Archivo: ${data.fileName}\n`;
    content += `========================================\n\n`;

    if (data.aiAnalysis) {
        content += `RESUMEN:\n${data.aiAnalysis.summary}\n\n`;
        content += `PONENTES:\n${data.aiAnalysis.speakers.join(', ')}\n\n`;
        content += `ETIQUETAS:\n${data.aiAnalysis.tags.join(', ')}\n\n`;
        content += `TRANSCRIPCIÓN:\n${data.aiAnalysis.transcription}\n\n`;
    }

    content += `\n--- METADATOS TÉCNICOS ---\n`;
    content += `Convertido a MP3: ${data.converted ? 'Sí' : 'No'}\n\n`;
    if (data.bwfInfo) {
        content += `Informe BWF:\n${data.bwfInfo}\n\n`;
    }
    if (data.mediaConchReport) {
        content += `Informe MediaConch:\n${data.mediaConchReport}\n\n`;
    }
    content += `Informe MediaInfo:\n${JSON.stringify(data.mediaInfo, null, 2)}\n`;

    return content;
}

export function generateCsv(data: AnalysisResult): string {
    let csv = 'Tipo,Contenido\n';

    if (data.aiAnalysis) {
        csv += `Resumen,"${data.aiAnalysis.summary.replace(/"/g, '""')}"\n`;
        csv += `Ponentes,"${data.aiAnalysis.speakers.join(', ')}"\n`;
        csv += `Etiquetas,"${data.aiAnalysis.tags.join(', ')}"\n`;
        csv += `Transcripción,"${data.aiAnalysis.transcription.replace(/"/g, '""')}"\n`;
    } else {
        csv += `Error,"No se pudo realizar el análisis de IA."\n`;
    }

    return csv;
}

export function exportResults(
    format: 'txt' | 'csv',
    data: AnalysisResult
): { fileContent: string; fileName: string; contentType: string } {
    let fileContent = '';
    let fileName = '';
    let contentType = '';

    switch (format) {
        case 'txt':
            fileContent = generateTxt(data);
            fileName = `${path.parse(data.fileName).name}_analisis.txt`;
            contentType = 'text/plain';
            break;
        case 'csv':
            fileContent = generateCsv(data);
            fileName = `${path.parse(data.fileName).name}_analisis.csv`;
            contentType = 'text/csv';
            break;
        default:
            throw new Error('Formato no soportado.');
    }
    return { fileContent, fileName, contentType };
}
