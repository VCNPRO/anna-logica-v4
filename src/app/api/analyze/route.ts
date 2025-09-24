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
  let shouldCleanup = false;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const serverFilePath = formData.get('serverFilePath') as string | null;
    const analysisType = formData.get('analysisType') as string || 'complete';

    // Handle large file upload (server file path) or regular upload
    if (serverFilePath) {
      // Large file already uploaded to server
      tempFilePath = serverFilePath;
      shouldCleanup = true;
    } else if (file) {
      // Regular file upload
      await ensureTempDir('analyze');
      tempFilePath = createTempFilePath(file.name, 'analyze');
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempFilePath, buffer);
      shouldCleanup = true;
    } else {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

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

    // Get MIME type from file or form data
    const mimeType = file?.type || formData.get('mimeType') as string || 'audio/mpeg';

    const filePart = {
      inlineData: {
        data: Buffer.from(await fs.readFile(tempFilePath)).toString("base64"),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    // console.log('Raw AI response:', text.substring(0, 500));

    // Extract JSON from response with better error handling
    let jsonString = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    // Try to find JSON in the response if it's not clean
    if (!jsonString.startsWith('{')) {
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
    }

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('JSON string was:', jsonString);

      // Fallback response
      aiAnalysis = {
        contentAnalysis: {
          type: "unknown",
          duration: "Desconocida",
          quality: "unknown",
          audioQuality: "No se pudo analizar",
          backgroundNoise: "No determinado",
          speechClarity: "No determinada"
        },
        technicalAnalysis: {
          format: "unknown",
          bitrate: "unknown",
          sampleRate: "unknown",
          channels: "unknown",
          compression: "unknown"
        },
        contentSummary: {
          mainContent: "Error en el procesamiento del análisis",
          topics: ["error"],
          speakers: "unknown",
          language: "unknown",
          mood: "unknown"
        },
        recommendations: ["Reintentar el análisis"],
        suitability: {
          transcription: "no determinada",
          archival: "no determinada",
          broadcast: "no determinada"
        }
      };
    }

    // Clean up temp file if needed
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';
    const fileSize = file?.size || parseInt(formData.get('fileSize') as string || '0');
    const fileType = file?.type || formData.get('mimeType') as string || 'unknown';

    return NextResponse.json({
      success: true,
      fileName: originalFileName,
      fileSize: fileSize,
      fileType: fileType,
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

    // Clean up temp file if it exists and we should clean it
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error analyzing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}