import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: Request) {
  try {
    const { transcription, fileName, format, language } = await request.json();

    if (!transcription || !format) {
      return NextResponse.json({ error: 'Missing transcription or format' }, { status: 400 });
    }

    const baseFileName = fileName?.replace(/\.[^/.]+$/, '') || 'transcription';
    let fileContent: string | Uint8Array;
    let contentType: string;
    let downloadFileName: string;

    switch (format.toLowerCase()) {
      case 'txt':
        // Clean text format - remove timestamps for pure text
        fileContent = cleanTranscriptionForTxt(transcription);
        contentType = 'text/plain';
        downloadFileName = `${baseFileName}.txt`;
        break;

      case 'srt':
        // SRT subtitle format with proper timing
        fileContent = convertToSRT(transcription);
        contentType = 'text/plain';
        downloadFileName = `${baseFileName}.srt`;
        break;

      case 'pdf':
        // PDF with professional formatting
        fileContent = await generatePDF(transcription, baseFileName, language);
        contentType = 'application/pdf';
        downloadFileName = `${baseFileName}.pdf`;
        break;

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${downloadFileName}"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({
      error: 'Failed to export transcription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Clean transcription text for TXT format
 */
function cleanTranscriptionForTxt(transcription: string): string {
  return transcription
    // Remove timestamp markers like [00:05]
    .replace(/\[[\d:]+\]/g, '')
    // Clean up extra whitespace
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Convert transcription to SRT subtitle format
 */
function convertToSRT(transcription: string): string {
  const lines = transcription.split('\n').filter(line => line.trim());
  let srtContent = '';
  let subtitleIndex = 1;

  for (const line of lines) {
    if (line.trim()) {
      // Extract timestamp if present
      const timestampMatch = line.match(/\[(\d{2}:\d{2}(?::\d{2})?)\]/);
      const text = line.replace(/\[[\d:]+\]\s*/, '').trim();

      if (text) {
        let startTime = '00:00:00,000';
        let endTime = '00:00:05,000'; // Default 5-second duration

        if (timestampMatch) {
          const time = timestampMatch[1];
          startTime = formatTimeForSRT(time);
          // Calculate end time (add 5 seconds or until next timestamp)
          endTime = addSecondsToSRTTime(startTime, 5);
        }

        srtContent += `${subtitleIndex}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${text}\n\n`;
        subtitleIndex++;
      }
    }
  }

  return srtContent;
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatTimeForSRT(time: string): string {
  const parts = time.split(':');
  if (parts.length === 2) {
    // MM:SS format
    return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')},000`;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')},000`;
  }
  return '00:00:00,000';
}

/**
 * Add seconds to SRT time format
 */
function addSecondsToSRTTime(srtTime: string, seconds: number): string {
  const [time, ms] = srtTime.split(',');
  const [hours, minutes, secs] = time.split(':').map(Number);

  let totalSeconds = hours * 3600 + minutes * 60 + secs + seconds;
  const newHours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const newMinutes = Math.floor(totalSeconds / 60);
  const newSecs = totalSeconds % 60;

  return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')},${ms || '000'}`;
}

/**
 * Generate PDF with professional formatting
 */
async function generatePDF(transcription: string, fileName: string, language: string = 'es'): Promise<Uint8Array> {
  const doc = new jsPDF();

  // PDF metadata
  doc.setProperties({
    title: `Transcripción - ${fileName}`,
    subject: 'Audio/Video Transcription',
    author: 'Anna Logica AI',
    creator: 'Scriptorium AI'
  });

  // Header
  doc.setFontSize(20);
  doc.text('TRANSCRIPCIÓN', 20, 30);

  doc.setFontSize(12);
  doc.text(`Archivo: ${fileName}`, 20, 45);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 55);
  doc.text(`Generado por: Scriptorium AI`, 20, 65);

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 75, 190, 75);

  // Content
  const lines = doc.splitTextToSize(transcription, 170);
  let yPosition = 90;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(11);

  for (const line of lines) {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 30;

      // Add page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(10);
      doc.text(`Página ${pageCount}`, 170, pageHeight - 20);
      doc.setFontSize(11);
    }

    doc.text(line, 20, yPosition);
    yPosition += 7;
  }

  // Footer on last page
  const finalPageCount = doc.getNumberOfPages();
  doc.setFontSize(10);
  doc.text(`Página ${finalPageCount}`, 170, pageHeight - 20);
  doc.text('Generado con Scriptorium AI - anna-logica.com', 20, pageHeight - 10);

  return doc.output('arraybuffer') as Uint8Array;
}