import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;
  let shouldCleanup = false;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const serverFilePath = formData.get('serverFilePath') as string | null;
    const speakerHints = formData.get('speakerHints') as string || '';
    // const language = formData.get('language') as string || 'auto'; // TODO: Use for language-specific processing

    // Handle large file upload (server file path) or regular upload
    if (serverFilePath) {
      // Large file already uploaded to server
      tempFilePath = serverFilePath;
      shouldCleanup = true;
    } else if (file) {
      // Regular file upload
      await ensureTempDir('speakers');
      tempFilePath = createTempFilePath(file.name, 'speakers');
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempFilePath, buffer);
      shouldCleanup = true;
    } else {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const hintsText = speakerHints ? `Pistas de oradores que podrían estar presentes: ${speakerHints}` : '';

    const prompt = `
      Analiza este archivo de audio e identifica a los diferentes oradores.
      ${hintsText}

      Devuelve un objeto JSON con la siguiente estructura:
      {
        "speakers": [
          {
            "id": "speaker_1",
            "name": "Nombre identificado o Speaker 1 si no se puede identificar",
            "segments": [
              {
                "start": "00:00",
                "end": "00:15",
                "text": "Texto que dice este orador"
              }
            ]
          }
        ],
        "totalSpeakers": 2,
        "summary": "Breve descripción de lo que ocurre en el audio"
      }

      Si puedes identificar nombres específicos basándote en las pistas o el contenido, úsalos.
      Si no, usa "Speaker 1", "Speaker 2", etc.
    `;

    // Get MIME type from file or form data
    const mimeType = file?.type || formData.get('mimeType') as string || 'audio/mpeg';

    const audioFilePart = {
      inlineData: {
        data: Buffer.from(await fs.readFile(tempFilePath)).toString("base64"),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, audioFilePart]);
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

    let speakerAnalysis;
    try {
      speakerAnalysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('JSON string was:', jsonString);

      // Fallback response
      speakerAnalysis = {
        speakers: [
          {
            id: "speaker_1",
            name: "Speaker 1",
            segments: [{ start: "00:00", end: "end", text: "Transcripción no disponible debido a error de procesamiento" }]
          }
        ],
        totalSpeakers: 1,
        summary: "Error en el procesamiento de identificación de oradores"
      };
    }

    // Clean up temp file if needed
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';

    return NextResponse.json({
      success: true,
      ...speakerAnalysis,
      fileName: originalFileName,
      speakerHints: speakerHints
    });

  } catch (error) {
    console.error('Speaker identification error:', error);

    // Clean up temp file if it exists and we should clean it
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error identifying speakers.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}