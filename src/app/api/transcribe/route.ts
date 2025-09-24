import { NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from '@/lib/temp-utils';
import { segmentMediaFile, cleanupSegments, formatTimestamp, convertToCompressedMp3, estimateCompressedSize, type MediaSegment } from '@/lib/media-segmentation';

export async function POST(request: Request) {
  let tempFilePath: string | null = null;
  let compressedFilePath: string | null = null;
  let shouldCleanup = false;
  let shouldCleanupCompressed = false;
  let segments: MediaSegment[] = [];

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const serverFilePath = formData.get('serverFilePath') as string | null;
    const language = formData.get('language') as string || 'auto';

    // Handle large file upload (server file path) or regular upload
    if (serverFilePath) {
      // Large file already uploaded to server
      tempFilePath = serverFilePath;
      shouldCleanup = true; // We should clean up the server file after processing
    } else if (file) {
      // Regular file upload
      await ensureTempDir('transcribe');
      tempFilePath = createTempFilePath(file.name, 'transcribe');
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(tempFilePath, buffer);
      shouldCleanup = true;
    } else {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Always convert to compressed MP3 first for optimal processing
    console.log('Converting file to compressed MP3 for optimal processing...');
    const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';
    const compressedFileName = `compressed_${Date.now()}_${originalFileName.replace(/\.[^/.]+$/, '')}.mp3`;
    compressedFilePath = createTempFilePath(compressedFileName, 'transcribe');

    // Convert to compressed MP3 (64kbps mono for maximum compression)
    await convertToCompressedMp3(tempFilePath, compressedFilePath, 64);
    shouldCleanupCompressed = true;

    // Validate compressed file
    const compressedStats = await fs.stat(compressedFilePath);
    if (compressedStats.size === 0) {
      throw new Error('Compressed file is empty - conversion failed');
    }
    if (compressedStats.size < 1000) { // Less than 1KB is suspicious
      throw new Error('Compressed file too small - possible conversion error');
    }
    if (compressedStats.size > 20 * 1024 * 1024) { // 20MB hard limit
      throw new Error('File too large even after compression');
    }

    console.log(`✅ File compressed successfully: ${(compressedStats.size / (1024 * 1024)).toFixed(2)}MB`);

    // Test that the MP3 file is valid by reading a small portion
    try {
      const testBuffer = Buffer.alloc(1024);
      const handle = await fs.open(compressedFilePath, 'r');
      await handle.read(testBuffer, 0, 1024, 0);
      await handle.close();

      // MP3 files should start with ID3 tag or sync frame
      const header = testBuffer.toString('hex', 0, 10);
      if (!header.startsWith('494433') && !header.includes('fff')) { // ID3 or sync frame
        console.warn('⚠️ Warning: File may not be a valid MP3');
      }
    } catch (error) {
      throw new Error('Compressed file appears to be corrupted');
    }

    // Now use the compressed file for all processing
    const processingFilePath = compressedFilePath;

    // Helper function to call Gemini API with fallback and retry logic
    async function callGeminiWithFallback(prompt: string, filePart: any): Promise<string> {
      const models = [
        { name: "gemini-1.5-flash", label: "Flash" },
        { name: "gemini-1.5-pro", label: "Pro" }
      ];

      for (const modelInfo of models) {
        const model = genAI.getGenerativeModel({ model: modelInfo.name });

        // Try with retry logic for each model
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Attempting transcription with ${modelInfo.label} (attempt ${attempt + 1}/3)...`);

            // Validate file part before sending
            if (!filePart.inlineData || !filePart.inlineData.data) {
              throw new Error('Invalid file data - missing inlineData');
            }

            // Validate base64 data
            const base64Data = filePart.inlineData.data;
            if (base64Data.length === 0) {
              throw new Error('Empty base64 data');
            }

            // Check if base64 is valid
            try {
              atob(base64Data.substring(0, 100)); // Test a small portion
            } catch (e) {
              throw new Error('Invalid base64 encoding');
            }

            // Log file info for debugging
            const fileSizeBytes = Math.ceil(base64Data.length * 3 / 4); // Approximate original size
            const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
            console.log(`📊 Sending to ${modelInfo.label}: ${fileSizeMB}MB, MIME: ${filePart.inlineData.mimeType}`);

            if (fileSizeBytes > 20 * 1024 * 1024) { // 20MB limit
              throw new Error(`File too large for Gemini: ${fileSizeMB}MB`);
            }

            const result = await model.generateContent([prompt, filePart]);
            const response = await result.response;
            const transcription = response.text();

            console.log(`✅ Success with ${modelInfo.label} on attempt ${attempt + 1}`);
            return transcription;
          } catch (error: any) {
            const isOverloaded = error.message?.includes('503') || error.message?.includes('overloaded');
            const isLastAttempt = attempt === 2;
            const isLastModel = modelInfo === models[models.length - 1];

            console.log(`❌ ${modelInfo.label} attempt ${attempt + 1} failed:`, error.message);

            if (isOverloaded && !isLastModel) {
              console.log(`🔄 ${modelInfo.label} is overloaded, switching to next model...`);
              break; // Switch to next model immediately
            }

            if (!isLastAttempt && !isOverloaded) {
              // Exponential backoff for non-overload errors
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`⏳ Retrying ${modelInfo.label} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else if (isLastAttempt && isLastModel) {
              throw error; // Final failure
            }
          }
        }
      }

      throw new Error('All models failed after retries');
    }

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

    // Get MIME type from file or form data
    const mimeType = file?.type || formData.get('mimeType') as string || 'audio/mpeg';

    // Check compressed file size to determine if segmentation is needed (Gemini limit ~20MB)
    const fileStats = await fs.stat(processingFilePath);
    const fileSizeInMB = fileStats.size / (1024 * 1024);
    const GEMINI_SIZE_LIMIT_MB = 18; // Conservative 18MB limit to account for base64 encoding overhead

    console.log(`Compressed file size: ${fileSizeInMB.toFixed(2)}MB`);

    if (fileSizeInMB > GEMINI_SIZE_LIMIT_MB) {
      console.log(`File exceeds Gemini limit (${GEMINI_SIZE_LIMIT_MB}MB). Starting segmentation...`);

      // Segment the compressed file into 5-minute chunks
      const segmentationResult = await segmentMediaFile(processingFilePath, 300); // 5 minutes
      segments = segmentationResult.segments;

      console.log(`Created ${segments.length} segments for processing`);

      // Process each segment individually
      const segmentResults: Array<{transcription: string, startTime: number, endTime: number}> = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`Processing segment ${i + 1}/${segments.length} (${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)})`);

        try {
          const segmentData = Buffer.from(await fs.readFile(segment.segmentPath)).toString("base64");
          const segmentFilePart = {
            inlineData: {
              data: segmentData,
              mimeType: 'audio/mpeg', // Segments are converted to MP3
            },
          };

          const segmentTranscription = await callGeminiWithFallback(prompt, segmentFilePart);

          segmentResults.push({
            transcription: segmentTranscription,
            startTime: segment.startTime,
            endTime: segment.endTime
          });

          console.log(`Segment ${i + 1} transcribed: ${segmentTranscription.substring(0, 100)}...`);
        } catch (segmentError) {
          console.error(`Error processing segment ${i + 1}:`, segmentError);
          // Continue with other segments even if one fails
          segmentResults.push({
            transcription: `[Error transcribing segment ${formatTimestamp(segment.startTime)} - ${formatTimestamp(segment.endTime)}]`,
            startTime: segment.startTime,
            endTime: segment.endTime
          });
        }
      }

      // Combine all segment transcriptions with timestamps
      const combinedTranscription = segmentResults
        .map(result => `[${formatTimestamp(result.startTime)}] ${result.transcription}`)
        .join('\n\n');

      // Clean up segments
      await cleanupSegments(segments);

      // Clean up temp files if needed
      if (shouldCleanup && tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }
      if (shouldCleanupCompressed && compressedFilePath) {
        await cleanupTempFile(compressedFilePath);
      }

      const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';

      return NextResponse.json({
        success: true,
        transcription: combinedTranscription,
        language: language,
        fileName: originalFileName,
        segmented: true,
        totalSegments: segments.length
      });

    } else {
      // Process file normally (under size limit)
      console.log('Processing file normally (under size limit)');

      const audioFilePart = {
        inlineData: {
          data: Buffer.from(await fs.readFile(processingFilePath)).toString("base64"),
          mimeType: 'audio/mpeg', // Always MP3 after compression
        },
      };

      console.log('Calling Gemini API for transcription...');
      const transcription = await callGeminiWithFallback(prompt, audioFilePart);

      console.log('Transcription response length:', transcription.length);
      console.log('Transcription preview:', transcription.substring(0, 100));

      // Clean up temp files if needed
      if (shouldCleanup && tempFilePath) {
        await cleanupTempFile(tempFilePath);
      }
      if (shouldCleanupCompressed && compressedFilePath) {
        await cleanupTempFile(compressedFilePath);
      }

      const originalFileName = file?.name || formData.get('originalFileName') as string || 'uploaded_file';

      return NextResponse.json({
        success: true,
        transcription: transcription.trim(),
        language: language,
        fileName: originalFileName,
        segmented: false
      });
    }

  } catch (error) {
    console.error('Transcription error:', error);

    // Clean up segments if they were created
    if (segments.length > 0) {
      await cleanupSegments(segments);
    }

    // Clean up all temp files if they exist and we should clean them
    if (shouldCleanup && tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
    if (shouldCleanupCompressed && compressedFilePath) {
      await cleanupTempFile(compressedFilePath);
    }

    const errorMessage = error instanceof Error ? error.message : 'Error transcribing file.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}