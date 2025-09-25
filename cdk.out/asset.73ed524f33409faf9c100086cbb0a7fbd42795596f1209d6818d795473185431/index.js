const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execFileAsync = promisify(execFile);

// FFmpeg binary from layer
const FFMPEG_PATH = '/opt/bin/ffmpeg';
const EFS_MOUNT = process.env.EFS_MOUNT_PATH || '/mnt/efs';

exports.handler = async (event) => {
  console.log('🚀 Anna Logica Enterprise Transcription Starting...');

  try {
    // Parse the incoming request
    const body = JSON.parse(event.body);
    const { filePath, language = 'auto' } = body;

    if (!filePath) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No file path provided' })
      };
    }

    const fullFilePath = path.join(EFS_MOUNT, filePath);

    // Check if file exists
    try {
      await fs.access(fullFilePath);
    } catch {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    console.log(`📁 Processing file: ${fullFilePath}`);

    // Get file stats
    const stats = await fs.stat(fullFilePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB`);

    // Convert to compressed MP3 for optimal Gemini processing
    const outputPath = path.join(EFS_MOUNT, `compressed_${Date.now()}.mp3`);

    console.log(`🎵 Converting to MP3 with FFmpeg: ${FFMPEG_PATH}`);
    await execFileAsync(FFMPEG_PATH, [
      '-i', fullFilePath,
      '-acodec', 'mp3',
      '-ab', '64k',
      '-ar', '44100',
      '-ac', '1', // Mono
      '-map_metadata', '-1', // Remove metadata
      '-y', // Overwrite
      outputPath
    ]);

    // Verify conversion
    const convertedStats = await fs.stat(outputPath);
    const convertedSizeMB = convertedStats.size / (1024 * 1024);
    console.log(`✅ Conversion successful: ${convertedSizeMB.toFixed(2)}MB`);

    // Check if we need segmentation (Gemini 20MB limit)
    if (convertedSizeMB > 18) {
      console.log('📂 File too large, segmenting...');

      // Get duration
      const { stderr } = await execFileAsync(FFMPEG_PATH, [
        '-i', outputPath,
        '-f', 'null',
        '-'
      ]);

      const durationMatch = stderr.match(/Duration: (\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})/);
      if (!durationMatch) {
        throw new Error('Could not determine file duration');
      }

      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      const segmentDuration = 300; // 5 minutes
      const numSegments = Math.ceil(totalSeconds / segmentDuration);

      console.log(`Creating ${numSegments} segments`);

      const segments = [];
      const segmentResults = [];

      for (let i = 0; i < numSegments; i++) {
        const startTime = i * segmentDuration;
        const endTime = Math.min(startTime + segmentDuration, totalSeconds);
        const duration = endTime - startTime;

        if (duration < 1) continue;

        const segmentPath = path.join(EFS_MOUNT, `segment_${i}.mp3`);

        // Create segment
        await execFileAsync(FFMPEG_PATH, [
          '-i', outputPath,
          '-ss', startTime.toString(),
          '-t', duration.toString(),
          '-acodec', 'mp3',
          '-ab', '128k',
          segmentPath
        ]);

        segments.push(segmentPath);

        // Process with Gemini (you'll implement this)
        const transcription = await processWithGemini(segmentPath, language);

        segmentResults.push({
          transcription,
          startTime,
          endTime
        });

        // Cleanup segment
        await fs.unlink(segmentPath);
      }

      // Cleanup converted file
      await fs.unlink(outputPath);

      // Combine results
      const combinedTranscription = segmentResults
        .map(result => `[${formatTimestamp(result.startTime)}] ${result.transcription}`)
        .join('\\n\\n');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          transcription: combinedTranscription,
          segmented: true,
          totalSegments: segmentResults.length
        })
      };

    } else {
      // Process directly
      const transcription = await processWithGemini(outputPath, language);

      // Cleanup
      await fs.unlink(outputPath);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          transcription,
          segmented: false
        })
      };
    }

  } catch (error) {
    console.error('❌ Transcription error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Transcription failed',
        details: error.message
      })
    };
  }
};

async function processWithGemini(filePath, language) {
  console.log(`🤖 Processing with Gemini: ${filePath}`);

  // Read file and convert to base64
  const fileBuffer = await fs.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');

  // Initialize Gemini (you'll need to add your API key as environment variable)
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const languageInstructions = {
    'auto': 'Detecta automáticamente el idioma y transcribe el audio.',
    'es': 'Transcribe el audio en español.',
    'en': 'Transcribe the audio in English.',
    'fr': 'Transcris l\\'audio en français.',
    'ca': 'Transcriu l\\'àudio en català.'
  };

  const prompt = `
    ${languageInstructions[language] || languageInstructions.auto}

    Proporciona SOLO la transcripción del texto hablado, sin comentarios adicionales.
    Si hay múltiples personas hablando, indica cada cambio de speaker con "Speaker 1:", "Speaker 2:", etc.
  `;

  const filePart = {
    inlineData: {
      data: base64Data,
      mimeType: 'audio/mpeg'
    }
  };

  // Try Gemini Flash first, then Pro as fallback
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

        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        const transcription = response.text();

        console.log(`✅ Success with ${modelInfo.label} on attempt ${attempt + 1}`);
        return transcription.trim();

      } catch (error) {
        const errorMessage = error.message || '';
        const isOverloaded = errorMessage.includes('503') || errorMessage.includes('overloaded');
        const isLastAttempt = attempt === 2;
        const isLastModel = modelInfo === models[models.length - 1];

        console.log(`❌ ${modelInfo.label} attempt ${attempt + 1} failed:`, errorMessage);

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

  throw new Error('All Gemini models failed after retries');
}

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}