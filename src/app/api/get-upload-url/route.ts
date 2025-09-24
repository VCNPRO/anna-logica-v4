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

    // For now, we'll create a simple implementation
    // In production, you'd generate signed URLs for AWS S3/Google Cloud

    const uploadId = crypto.randomUUID();
    const uploadUrl = `/api/large-upload/${uploadId}`;

    const response = NextResponse.json({
      uploadId,
      uploadUrl,
      maxChunkSize: 5 * 1024 * 1024 // 5MB chunks
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