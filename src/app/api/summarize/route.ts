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
    const summaryType = formData.get('summaryType') as string || 'detailed'; // 'short' or 'detailed'
    // const language = formData.get('language') as string || 'auto'; // TODO: Use for language-specific processing

    // Handle large file upload (server file path) or regular upload
    if (serverFilePath) {
      // Large file already uploaded to server
      tempFilePath = serverFilePath;
      shouldCleanup = true;
    } else if (file) {
      // Regular file upload
      await ensureTempDir('summarize');
      tempFilePath = createTempFilePath(file.name, 'summarize');
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempFilePath, buffer);
      shouldCleanup = true;
    } else {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

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

    let analysis;
    try {
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('JSON string was:', jsonString);

      // Fallback response
      analysis = {
        summary: "Error en el procesamiento del resumen",
        tags: ["error", "procesamiento"],
        mainTopics: ["Error de análisis"],
        duration: "Desconocida",
        language: "Desconocido",
        sentiment: "neutral",
        confidence: 0.0
      };
    }

    // Clean up temp file if needed
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';

    return NextResponse.json({
      success: true,
      ...analysis,
      summaryType: summaryType,
      fileName: originalFileName
    });

  } catch (error) {
    console.error('Summarization error:', error);

    // Clean up temp file if it exists and we should clean it
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error summarizing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}