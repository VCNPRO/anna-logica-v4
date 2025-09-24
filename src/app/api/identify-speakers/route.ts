import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const speakerHints = formData.get('speakerHints') as string || '';
    // const language = formData.get('language') as string || 'auto'; // TODO: Use for language-specific processing

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Save file temporarily
    const uploadDir = path.join(process.cwd(), 'tmp', 'speakers');
    await fs.mkdir(uploadDir, { recursive: true });

    tempFilePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

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

    const audioFilePart = {
      inlineData: {
        data: Buffer.from(await fs.readFile(tempFilePath)).toString("base64"),
        mimeType: file.type,
      },
    };

    const result = await model.generateContent([prompt, audioFilePart]);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonString = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    const speakerAnalysis = JSON.parse(jsonString);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return NextResponse.json({
      success: true,
      ...speakerAnalysis,
      fileName: file.name,
      speakerHints: speakerHints
    });

  } catch (error) {
    console.error('Speaker identification error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }

    const errorMessage = error instanceof Error ? error.message : 'Error identifying speakers.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}