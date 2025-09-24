import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetLanguage = formData.get('targetLanguage') as string || 'en';
    const sourceLanguage = formData.get('sourceLanguage') as string || 'auto';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Save file temporarily
    await ensureTempDir('translate');
    tempFilePath = createTempFilePath(file.name, 'translate');
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const languageNames = {
      'es': 'español',
      'en': 'English',
      'fr': 'français',
      'ca': 'català',
      'auto': 'detectado automáticamente'
    };

    const sourceText = sourceLanguage === 'auto' ?
      'Detecta automáticamente el idioma del audio' :
      `El audio está en ${languageNames[sourceLanguage as keyof typeof languageNames]}`;

    const targetText = languageNames[targetLanguage as keyof typeof languageNames];

    const prompt = `
      ${sourceText} y tradúcelo completamente al ${targetText}.

      Devuelve un objeto JSON con la siguiente estructura:
      {
        "originalText": "Transcripción original del audio...",
        "translatedText": "Traducción completa al idioma destino...",
        "sourceLanguage": "Idioma detectado o especificado",
        "targetLanguage": "${targetLanguage}",
        "confidence": 0.95,
        "summary": "Breve resumen del contenido traducido"
      }

      Mantén el formato y estructura del texto original, incluyendo párrafos y cambios de speaker si los hay.
      Proporciona una traducción natural y fluida, no literal.
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
    const translation = JSON.parse(jsonString);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return NextResponse.json({
      success: true,
      ...translation,
      fileName: file.name
    });

  } catch (error) {
    console.error('Translation error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }

    const errorMessage = error instanceof Error ? error.message : 'Error translating file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}