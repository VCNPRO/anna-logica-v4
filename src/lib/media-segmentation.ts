import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { createTempFilePath, ensureTempDir, cleanupTempFile } from './temp-utils';

const execFileAsync = promisify(execFile);

// Check if FFmpeg is available at given path
async function checkFFmpegAvailability(path: string): Promise<boolean> {
  try {
    await execFileAsync(path, ['-version']);
    return true;
  } catch {
    return false;
  }
}

// Detect FFmpeg path based on environment
async function getFFmpegPath(): Promise<string> {
  const possiblePaths = [];

  // Try @ffmpeg-installer/ffmpeg first (works in serverless)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    if (ffmpeg.path && typeof ffmpeg.path === 'string') {
      possiblePaths.push(ffmpeg.path);
      console.log(`🎯 Found @ffmpeg-installer path: ${ffmpeg.path}`);
    }
  } catch (error) {
    console.log('❌ @ffmpeg-installer not available:', error);
  }

  // Production (Vercel, Netlify, etc.) - Add system paths as fallback
  if (process.env.NODE_ENV === 'production') {
    possiblePaths.push(
      'ffmpeg',
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg'
    );
  } else if (process.platform === 'win32') {
    // Development (Windows local)
    possiblePaths.push(
      "C:\\ffmpeg\\bin\\ffmpeg.exe",
      'ffmpeg'
    );
  } else {
    // Unix systems (macOS, Linux)
    possiblePaths.push(
      'ffmpeg',
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg'
    );
  }

  // Test each path and return the first working one
  for (const path of possiblePaths) {
    console.log(`🔍 Testing FFmpeg path: ${path}`);
    if (await checkFFmpegAvailability(path)) {
      console.log(`✅ Found working FFmpeg at: ${path}`);
      return path;
    }
  }

  // If nothing works, return 'ffmpeg' as fallback
  console.log('⚠️  No working FFmpeg found, using fallback: ffmpeg');
  return 'ffmpeg';
}

// FFmpeg path will be resolved at runtime

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

/**
 * Get media duration using FFmpeg
 */
export async function getMediaDuration(filePath: string): Promise<number> {
  try {
    const ffmpegPath = await getFFmpegPath();
    console.log(`🎥 Getting duration with FFmpeg: ${ffmpegPath}`);
    const { stdout, stderr } = await execFileAsync(ffmpegPath, [
      '-i', filePath,
      '-f', 'null',
      '-'
    ]);

    // FFmpeg writes info to stderr, not stdout
    const output = stderr || stdout;
    console.log('FFmpeg output sample:', output.substring(0, 200));

    // Parse duration from FFmpeg output
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (!durationMatch) {
      console.error('Full FFmpeg output:', output);
      throw new Error('Could not parse media duration from FFmpeg output');
    }

    const hours = parseInt(durationMatch[1]);
    const minutes = parseInt(durationMatch[2]);
    const seconds = parseFloat(durationMatch[3]);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    console.log(`📊 Media duration: ${totalSeconds}s (${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')})`);

    return totalSeconds;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error getting media duration:', errorMessage);
    console.error('File path:', filePath);

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`FFmpeg not found. Please install FFmpeg.`);
    }

    throw new Error(`Failed to get media duration: ${errorMessage}`);
  }
}

/**
 * Split large media file into time-based segments
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

      // Extract segment using FFmpeg
      const ffmpegPath = await getFFmpegPath();
      await execFileAsync(ffmpegPath, [
        '-i', filePath,
        '-ss', startTime.toString(),
        '-t', actualDuration.toString(),
        '-acodec', 'mp3',
        '-ab', '128k', // Lower bitrate for IA processing
        '-ar', '44100',
        '-y', // Overwrite output file
        segmentPath
      ]);

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

    console.log(`Successfully created ${segments.length} segments`);

    return {
      segments,
      totalDuration,
      originalFilePath: filePath
    };

  } catch (error) {
    console.error('Error segmenting media file:', error);
    throw new Error(`Failed to segment media file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * Convert any audio/video file to compressed MP3
 */
export async function convertToCompressedMp3(
  inputPath: string,
  outputPath: string,
  bitrate: number = 64 // 64kbps for maximum compression while maintaining intelligibility
): Promise<void> {
  try {
    const ffmpegPath = await getFFmpegPath();
    console.log(`🎵 Converting to MP3 with FFmpeg: ${ffmpegPath}`);
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}`);
    console.log(`🎛️ Bitrate: ${bitrate}kbps`);

    const { stderr } = await execFileAsync(ffmpegPath, [
      '-i', inputPath,
      '-acodec', 'mp3',
      '-ab', `${bitrate}k`,
      '-ar', '44100', // Standard sample rate
      '-ac', '1', // Convert to mono for even smaller size
      '-map_metadata', '-1', // Remove all metadata to reduce size
      '-y', // Overwrite output file
      outputPath
    ]);

    // Log FFmpeg output for debugging
    if (stderr) {
      console.log('FFmpeg conversion info:', stderr.substring(0, 300));
    }

    // Verify conversion was successful
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Converted file is empty - FFmpeg conversion failed');
    }

    if (stats.size < 1000) {
      throw new Error('Converted file too small - possible conversion error');
    }

    console.log(`✅ MP3 conversion successful!`);
    console.log(`📊 Original: ${inputPath}`);
    console.log(`📊 Compressed: ${outputPath} (${(stats.size / (1024 * 1024)).toFixed(2)}MB)`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ MP3 conversion failed:', errorMessage);
    console.error('Input file:', inputPath);
    console.error('Output file:', outputPath);

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`FFmpeg not found. Please install FFmpeg.`);
    }

    throw new Error(`Failed to convert to MP3: ${errorMessage}`);
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
  } catch (error) {
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