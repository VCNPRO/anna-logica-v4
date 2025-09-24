import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';

const execFileAsync = promisify(execFile);
const mediaInfoPath = "C:\\MediaInfo_CLI_25.07_Windows_x64\\mediainfo.exe";
const mediaConchPath = "C:\\MediaConch_CLI_25.04_Windows_x64\\mediaconch.exe";

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const analysisType = formData.get('analysisType') as string || 'complete';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Save file temporarily
    await ensureTempDir('analyze');
    tempFilePath = createTempFilePath(file.name, 'analyze');
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    // Technical analysis with external tools
    let mediaInfo = null;
    let mediaConchReport = null;

    try {
      const { stdout: mediaInfoOutput } = await execFileAsync(mediaInfoPath, ['--Output=JSON', tempFilePath]);
      mediaInfo = JSON.parse(mediaInfoOutput);
    } catch {
      console.log('MediaInfo analysis failed, continuing without it');
    }

    try {
      const { stdout: mediaConchOutput } = await execFileAsync(mediaConchPath, ['-f', tempFilePath]);
      mediaConchReport = mediaConchOutput;
    } catch {
      console.log('MediaConch analysis failed, continuing without it');
    }

    // AI-powered content analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Realiza un análisis completo de este archivo multimedia.

      Devuelve un objeto JSON con la siguiente estructura:
      {
        "contentAnalysis": {
          "type": "audio/video/documento",
          "duration": "Duración estimada",
          "quality": "alta/media/baja",
          "audioQuality": "Evaluación de la calidad del audio",
          "backgroundNoise": "nivel de ruido de fondo",
          "speechClarity": "claridad del habla"
        },
        "technicalAnalysis": {
          "format": "formato del archivo",
          "bitrate": "bitrate estimado",
          "sampleRate": "frecuencia de muestreo",
          "channels": "número de canales",
          "compression": "tipo de compresión"
        },
        "contentSummary": {
          "mainContent": "Descripción del contenido principal",
          "topics": ["tema1", "tema2", "..."],
          "speakers": "número aproximado de speakers",
          "language": "idioma detectado",
          "mood": "tono general del contenido"
        },
        "recommendations": [
          "Recomendación 1 para mejorar calidad o procesamiento",
          "Recomendación 2...",
          "..."
        ],
        "suitability": {
          "transcription": "adecuado/parcialmente adecuado/no adecuado",
          "archival": "adecuado para archivo a largo plazo",
          "broadcast": "calidad suficiente para difusión"
        }
      }
    `;

    const filePart = {
      inlineData: {
        data: Buffer.from(await fs.readFile(tempFilePath)).toString("base64"),
        mimeType: file.type,
      },
    };

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    const aiAnalysis = JSON.parse(jsonString);

    // Clean up temp file
    await cleanupTempFile(tempFilePath);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      aiAnalysis: aiAnalysis,
      technicalData: {
        mediaInfo: mediaInfo,
        mediaConchReport: mediaConchReport
      },
      analysisType: analysisType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('File analysis error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error analyzing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}