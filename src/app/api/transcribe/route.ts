import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const language = formData.get('language') as string || 'auto';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Save file temporarily
    await ensureTempDir('transcribe');
    tempFilePath = createTempFilePath(file.name, 'transcribe');
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const languageInstructions = {
      'auto': 'Detecta automáticamente el idioma y transcribe el audio.',
      'es': 'Transcribe el audio en español.',
      'en': 'Transcribe the audio in English.',
      'fr': 'Transcris l\'audio en français.',
      'ca': 'Transcriu l\'àudio en català.'
    };

    const prompt = `
      ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.auto}

      Proporciona SOLO la transcripción del texto hablado, sin comentarios adicionales.
      Si hay múltiples personas hablando, indica cada cambio de speaker con "Speaker 1:", "Speaker 2:", etc.
    `;

    const audioFilePart = {
      inlineData: {
        data: Buffer.from(await fs.readFile(tempFilePath)).toString("base64"),
        mimeType: file.type,
      },
    };

    console.log('Calling Gemini API for transcription...');
    const result = await model.generateContent([prompt, audioFilePart]);
    const response = await result.response;
    const transcription = response.text();

    console.log('Transcription response length:', transcription.length);
    console.log('Transcription preview:', transcription.substring(0, 100));

    // Clean up temp file
    await cleanupTempFile(tempFilePath);

    return NextResponse.json({
      success: true,
      transcription: transcription.trim(),
      language: language,
      fileName: file.name
    });

  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error transcribing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}