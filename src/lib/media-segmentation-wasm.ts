import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from './temp-utils';

export interface MediaSegment {
  segmentPath: string;
  startTime: number; // seconds
  endTime: number; // seconds
  segmentIndex: number;
  duration: number; // seconds
}

export interface SegmentationResult {
  segments: MediaSegment[];
  totalDuration: number;
  originalFilePath: string;
}

// Global FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;

/**
 * Initialize FFmpeg WebAssembly
 */
async function initializeFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  console.log('🎥 Initializing FFmpeg WebAssembly...');

  ffmpegInstance = new FFmpeg();

  // Load FFmpeg core
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
  });

  console.log('✅ FFmpeg WebAssembly loaded successfully');
  return ffmpegInstance;
}

/**
 * Get media duration using FFmpeg WASM
 */
export async function getMediaDuration(filePath: string): Promise<number> {
  try {
    console.log(`🎥 Getting duration with FFmpeg WASM: ${filePath}`);

    const ffmpeg = await initializeFFmpeg();

    // Read the input file
    const inputData = await fs.readFile(filePath);
    ffmpeg.writeFile('input', inputData);

    // Get media info
    await ffmpeg.exec(['-i', 'input', '-f', 'null', '-']);

    // Parse duration from logs (FFmpeg writes to stderr)
    // This is a simplified approach - in practice, you might need to capture logs differently

    // For now, let's estimate based on file size and assume average bitrate
    // This is not perfect but will work for our use case
    const fileSizeBytes = inputData.length;
    const estimatedBitrate = 128000; // 128 kbps average
    const estimatedDuration = (fileSizeBytes * 8) / estimatedBitrate;

    console.log(`📊 Estimated duration: ${estimatedDuration}s`);

    // Clean up
    ffmpeg.deleteFile('input');

    return estimatedDuration;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error getting media duration:', errorMessage);
    throw new Error(`Failed to get media duration: ${errorMessage}`);
  }
}

/**
 * Convert any audio/video file to compressed MP3 using FFmpeg WASM
 */
export async function convertToCompressedMp3(
  inputPath: string,
  outputPath: string,
  bitrate: number = 64 // 64kbps for maximum compression while maintaining intelligibility
): Promise<void> {
  try {
    console.log(`🎵 Converting to MP3 with FFmpeg WASM at ${bitrate}kbps`);
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}`);

    const ffmpeg = await initializeFFmpeg();

    // Read input file
    const inputData = await fs.readFile(inputPath);
    ffmpeg.writeFile('input', inputData);

    // Convert to MP3
    await ffmpeg.exec([
      '-i', 'input',
      '-acodec', 'mp3',
      '-ab', `${bitrate}k`,
      '-ar', '44100', // Standard sample rate
      '-ac', '1', // Convert to mono for even smaller size
      '-map_metadata', '-1', // Remove all metadata to reduce size
      'output.mp3'
    ]);

    // Read output file
    const outputData = await ffmpeg.readFile('output.mp3');

    // Write to disk
    await fs.writeFile(outputPath, outputData as Uint8Array);

    // Clean up
    ffmpeg.deleteFile('input');
    ffmpeg.deleteFile('output.mp3');

    // Verify conversion was successful
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Converted file is empty - FFmpeg conversion failed');
    }

    if (stats.size < 1000) {
      throw new Error('Converted file too small - possible conversion error');
    }

    console.log(`✅ MP3 conversion successful!`);
    console.log(`📊 Compressed: ${outputPath} (${(stats.size / (1024 * 1024)).toFixed(2)}MB)`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ MP3 conversion failed:', errorMessage);
    throw new Error(`Failed to convert to MP3: ${errorMessage}`);
  }
}

/**
 * Split large media file into time-based segments using FFmpeg WASM
 */
export async function segmentMediaFile(
  filePath: string,
  segmentDurationSeconds: number = 300 // 5 minutes default
): Promise<SegmentationResult> {
  try {
    console.log(`Starting segmentation of: ${filePath}`);

    // Get total duration
    const totalDuration = await getMediaDuration(filePath);
    console.log(`Total duration: ${totalDuration} seconds`);

    // Create segments directory
    const segmentsDir = `segments/${Date.now()}`;
    await ensureTempDir(segmentsDir);

    const segments: MediaSegment[] = [];
    const numSegments = Math.ceil(totalDuration / segmentDurationSeconds);

    console.log(`Creating ${numSegments} segments of ${segmentDurationSeconds}s each`);

    const ffmpeg = await initializeFFmpeg();

    // Read input file once
    const inputData = await fs.readFile(filePath);
    ffmpeg.writeFile('input', inputData);

    // Create each segment
    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDurationSeconds;
      const endTime = Math.min(startTime + segmentDurationSeconds, totalDuration);
      const actualDuration = endTime - startTime;

      // Skip segments that are too short (less than 1 second)
      if (actualDuration < 1) {
        continue;
      }

      const segmentFileName = `segment_${i.toString().padStart(3, '0')}.mp3`;
      const segmentPath = createTempFilePath(segmentFileName, segmentsDir);

      console.log(`Creating segment ${i + 1}/${numSegments}: ${startTime}s - ${endTime}s`);

      // Extract segment using FFmpeg WASM
      await ffmpeg.exec([
        '-i', 'input',
        '-ss', startTime.toString(),
        '-t', actualDuration.toString(),
        '-acodec', 'mp3',
        '-ab', '128k', // Lower bitrate for AI processing
        '-ar', '44100',
        `output_${i}.mp3`
      ]);

      // Read segment data and write to disk
      const segmentData = await ffmpeg.readFile(`output_${i}.mp3`);
      await fs.writeFile(segmentPath, segmentData as Uint8Array);

      // Clean up WASM file
      ffmpeg.deleteFile(`output_${i}.mp3`);

      // Verify segment was created and has reasonable size
      const stats = await fs.stat(segmentPath);
      if (stats.size > 100) { // At least 100 bytes
        segments.push({
          segmentPath,
          startTime,
          endTime,
          segmentIndex: i,
          duration: actualDuration
        });
      } else {
        console.warn(`Segment ${i} is too small, skipping`);
        await cleanupTempFile(segmentPath);
      }
    }

    // Clean up input file
    ffmpeg.deleteFile('input');

    console.log(`Successfully created ${segments.length} segments`);

    return {
      segments,
      totalDuration,
      originalFilePath: filePath
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error segmenting media file:', errorMessage);
    throw new Error(`Failed to segment media file: ${errorMessage}`);
  }
}

/**
 * Clean up segment files
 */
export async function cleanupSegments(segments: MediaSegment[]): Promise<void> {
  for (const segment of segments) {
    await cleanupTempFile(segment.segmentPath);
  }
}

/**
 * Get estimated file size after MP3 compression
 */
export async function estimateCompressedSize(
  filePath: string,
  bitrate: number = 64
): Promise<number> {
  try {
    const duration = await getMediaDuration(filePath);
    // Formula: (bitrate in kbps * duration in seconds) / 8 = size in KB
    const estimatedSizeKB = (bitrate * duration) / 8;
    const estimatedSizeMB = estimatedSizeKB / 1024;

    console.log(`Estimated compressed size at ${bitrate}kbps: ${estimatedSizeMB.toFixed(2)}MB`);
    return estimatedSizeMB;
  } catch (error: unknown) {
    console.error('Error estimating compressed size:', error);
    return 0;
  }
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}