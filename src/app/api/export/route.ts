import { NextResponse } from 'next/server';
import { exportResults } from '@/lib/export-utils'; 
import { type AnalysisResult } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { format, data } = body as { format: 'txt' | 'csv', data: AnalysisResult };

        if (!format || !data) {
            return NextResponse.json({ error: 'Faltan parámetros: se requiere formato y datos.' }, { status: 400 });
        }

        const { fileContent, fileName, contentType } = exportResults(format, data);

        const headers = new Headers();
        headers.set('Content-Type', `${contentType}; charset=utf-8`);
        headers.set('Content-Disposition', `attachment; filename="${fileName}"`);

        return new NextResponse(fileContent, { headers });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Error al generar el archivo de exportación.' }, { status: 500 });
    }
}