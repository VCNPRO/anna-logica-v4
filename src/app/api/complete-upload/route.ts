import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createTempFilePathExact, ensureTempDir, getTempDir } from '@/lib/temp-utils';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: Request) {
  try {
    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json({
        error: 'Missing uploadId'
      }, { status: 400 });
    }

    const chunksDir = path.join(getTempDir(), 'uploads', uploadId, 'chunks');

    // console.log(`Looking for chunks in: ${chunksDir}`);

    // Read all chunk files
    const chunkFiles = await fs.readdir(chunksDir);
    // console.log(`Found ${chunkFiles.length} files in chunks directory:`, chunkFiles);

    // Filter for chunk files (handle both patterns for backward compatibility)
    const sortedChunks = chunkFiles
      .filter(file => {
        const isOldPattern = file.includes('_chunk_') && file.endsWith('.part');
        const isNewPattern = file.startsWith('chunk_') && file.endsWith('.part');
        return isOldPattern || isNewPattern;
      })
      .sort((a, b) => {
        // Extract index from either pattern
        let indexA, indexB;

        if (a.includes('_chunk_')) {
          indexA = parseInt(a.split('_chunk_')[1].replace('.part', ''));
        } else {
          indexA = parseInt(a.replace('chunk_', '').replace('.part', ''));
        }

        if (b.includes('_chunk_')) {
          indexB = parseInt(b.split('_chunk_')[1].replace('.part', ''));
        } else {
          indexB = parseInt(b.replace('chunk_', '').replace('.part', ''));
        }

        return indexA - indexB;
      });

    // console.log(`Filtered chunks:`, sortedChunks);

    if (sortedChunks.length === 0) {
      return NextResponse.json({
        error: `No valid chunks found for upload. Files found: ${chunkFiles.join(', ')}`
      }, { status: 400 });
    }

    // Create final file path with timestamp to ensure uniqueness
    await ensureTempDir('uploads');
    const timestamp = Date.now();
    const finalFilePath = createTempFilePathExact(`${timestamp}_upload_${uploadId}.tmp`, 'uploads');

    // console.log(`Creating final file at: ${finalFilePath}`);

    // Combine chunks
    const writeStream = await fs.open(finalFilePath, 'w');

    try {
      for (const chunkFile of sortedChunks) {
        const chunkPath = path.join(chunksDir, chunkFile);
        const chunkData = await fs.readFile(chunkPath);
        await writeStream.writeFile(chunkData);

        // Clean up chunk file
        await fs.unlink(chunkPath);
      }
    } finally {
      await writeStream.close();
    }

    // Clean up chunks directory
    try {
      await fs.rmdir(chunksDir);
      await fs.rmdir(path.join(getTempDir(), 'uploads', uploadId));
    } catch (error) {
      console.warn('Failed to clean up chunks directory:', error);
    }

    // console.log(`Upload ${uploadId} completed successfully: ${finalFilePath}`);

    const response = NextResponse.json({
      success: true,
      uploadId,
      filePath: finalFilePath,
      message: 'Upload completed successfully'
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json({
      error: 'Failed to complete upload'
    }, { status: 500 });
  }
}