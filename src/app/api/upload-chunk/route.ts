import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createTempFilePathExact, ensureTempDir } from '@/lib/temp-utils';

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
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = formData.get('chunkIndex') as string;
    const uploadId = formData.get('uploadId') as string;

    console.log('Received chunk upload request:', {
      hasChunk: !!chunk,
      chunkSize: chunk?.size || 0,
      chunkIndex,
      uploadId
    });

    if (!chunk || !chunkIndex || !uploadId) {
      const error = {
        error: 'Missing required fields',
        received: {
          chunk: !!chunk,
          chunkIndex: !!chunkIndex,
          uploadId: !!uploadId
        }
      };
      console.error('Upload chunk validation failed:', error);
      return NextResponse.json(error, { status: 400 });
    }

    if (chunk.size === 0) {
      const error = { error: 'Chunk is empty', chunkIndex, uploadId };
      console.error('Empty chunk received:', error);
      return NextResponse.json(error, { status: 400 });
    }

    // Create chunks directory for this upload
    const chunksDir = `uploads/${uploadId}/chunks`;
    await ensureTempDir(chunksDir);

    // Save chunk to temporary file - use exact naming without timestamp
    const chunkFileName = `chunk_${chunkIndex}.part`;
    const chunkFilePath = createTempFilePathExact(chunkFileName, chunksDir);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.writeFile(chunkFilePath, buffer);

    console.log(`Saved chunk ${chunkIndex} to: ${chunkFilePath}`);
    console.log(`Chunk ${chunkIndex} saved for upload ${uploadId}`);

    const response = NextResponse.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      uploadId,
      message: `Chunk ${chunkIndex} uploaded successfully`
    });

    // Add CORS headers for Vercel
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error) {
    console.error('Error uploading chunk:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      uploadId,
      chunkIndex
    });
    return NextResponse.json({
      error: 'Failed to upload chunk',
      details: error instanceof Error ? error.message : 'Unknown error',
      uploadId,
      chunkIndex
    }, { status: 500 });
  }
}