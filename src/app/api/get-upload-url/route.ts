import { NextResponse } from 'next/server';

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
    const { fileName, fileSize, fileType } = await request.json();

    // Validate file size (up to 100MB for now)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxSize) {
      return NextResponse.json({
        error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
      }, { status: 400 });
    }

    // Generate upload ID for chunked upload system
    const uploadId = crypto.randomUUID();

    // Use existing endpoints for chunked upload
    const uploadUrl = `/api/upload-chunk`; // Use existing upload-chunk endpoint
    const completeUrl = `/api/complete-upload`; // Use existing complete-upload endpoint

    const response = NextResponse.json({
      uploadId,
      uploadUrl,
      completeUrl,
      maxChunkSize: 3 * 1024 * 1024, // 3MB chunks (safe for Vercel limits)
      chunkUploadMethod: 'POST',
      fileName,
      fileSize,
      totalChunks: Math.ceil(fileSize / (3 * 1024 * 1024))
    });

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return response;

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({
      error: 'Failed to generate upload URL'
    }, { status: 500 });
  }
}