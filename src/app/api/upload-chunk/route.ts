import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createTempFilePathExact, ensureTempDir } from '@/lib/temp-utils';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = formData.get('chunkIndex') as string;
    const uploadId = formData.get('uploadId') as string;

    if (!chunk || !chunkIndex || !uploadId) {
      return NextResponse.json({
        error: 'Missing required fields: chunk, chunkIndex, or uploadId'
      }, { status: 400 });
    }

    // Create chunks directory for this upload
    const chunksDir = `uploads/${uploadId}/chunks`;
    await ensureTempDir(chunksDir);

    // Save chunk to temporary file - use exact naming without timestamp
    const chunkFileName = `chunk_${chunkIndex}.part`;
    const chunkFilePath = createTempFilePathExact(chunkFileName, chunksDir);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.writeFile(chunkFilePath, buffer);

    // console.log(`Saved chunk ${chunkIndex} to: ${chunkFilePath}`);
    // console.log(`Chunk ${chunkIndex} saved for upload ${uploadId}`);

    return NextResponse.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      uploadId,
      message: `Chunk ${chunkIndex} uploaded successfully`
    });

  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json({
      error: 'Failed to upload chunk'
    }, { status: 500 });
  }
}