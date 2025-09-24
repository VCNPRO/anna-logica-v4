import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const summaryType = formData.get('summaryType') as string || 'detailed'; // 'short' or 'detailed'
    const language = formData.get('language') as string || 'auto';

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Save file temporarily
    const uploadDir = path.join(process.cwd(), 'tmp', 'summarize');
    await fs.mkdir(uploadDir, { recursive: true });

    tempFilePath = path.join(uploadDir, `${Date.now()}_${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const summaryInstructions = {
      short: 'Crea un resumen muy conciso (2-3 frases) del contenido principal.',
      detailed: 'Crea un resumen detallado que incluya los puntos principales, conclusiones y temas tratados.'
    };

    const prompt = `
      Analiza este archivo de audio y proporciona un resumen y etiquetas.

      ${summaryInstructions[summaryType as keyof typeof summaryInstructions] || summaryInstructions.detailed}

      Devuelve un objeto JSON con la siguiente estructura:
      {
        "summary": "Resumen del contenido...",
        "tags": ["etiqueta1", "etiqueta2", "etiqueta3", "..."],
        "mainTopics": ["tema principal 1", "tema principal 2", "..."],
        "duration": "Duración aproximada en minutos",
        "language": "Idioma detectado",
        "sentiment": "positive/neutral/negative",
        "confidence": 0.85
      }

      Las etiquetas deben ser palabras clave relevantes del contenido.
      Los temas principales deben ser conceptos o áreas temáticas abordadas.
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
    const analysis = JSON.parse(jsonString);

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return NextResponse.json({
      success: true,
      ...analysis,
      summaryType: summaryType,
      fileName: file.name
    });

  } catch (error) {
    console.error('Summarization error:', error);

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch {}
    }

    const errorMessage = error instanceof Error ? error.message : 'Error summarizing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}