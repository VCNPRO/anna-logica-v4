import { NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/aws-config';

// Unified Transcription API - Single point of entry
export async function POST(request: Request) {
  try {
    console.log('🚀 Anna Logica - Unified Transcription Flow Started');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // File info
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;

    console.log(`📁 Processing: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`🔄 File type: ${fileType}`);

    try {
      // Call unified AWS Lambda endpoint
      const awsApiUrl = getApiUrl();
      console.log(`🌐 Calling AWS Lambda: ${awsApiUrl}/transcribe`);

      // Prepare form data for Lambda
      const lambdaFormData = new FormData();
      lambdaFormData.append('file', file);
      lambdaFormData.append('fileName', fileName);
      lambdaFormData.append('fileType', fileType);

      const lambdaResponse = await fetch(`${awsApiUrl}/transcribe`, {
        method: 'POST',
        body: lambdaFormData
      });

      if (!lambdaResponse.ok) {
        console.error('❌ AWS Lambda error:', lambdaResponse.status, lambdaResponse.statusText);

        return NextResponse.json({
          success: false,
          error: 'Transcription service unavailable',
          statusCode: lambdaResponse.status
        }, { status: 500 });
      }

      const result = await lambdaResponse.json();
      console.log('✅ AWS Lambda transcription completed');

      // Return unified response
      return NextResponse.json({
        success: true,
        transcription: result.transcription,
        summary: result.summary,
        speakers: result.speakers,
        timestamps: result.timestamps,
        confidence: result.confidence,
        language: result.language,
        jobId: result.jobId,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        provider: 'Anna Logica Enterprise - AWS Transcribe',
        processingInfo: {
          ...result.processingInfo,
          originalFileName: fileName,
          originalFileSize: fileSize,
          originalFileType: fileType,
          timestamp: new Date().toISOString(),
          apiVersion: 'v1-unified'
        }
      });

    } catch (error) {
      console.error('🚨 Transcription error:', error);

      return NextResponse.json({
        success: false,
        error: 'Failed to process transcription',
        details: error instanceof Error ? error.message : 'Unknown error',
        fileName: fileName,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Request processing error:', error);

    return NextResponse.json({
      success: false,
      error: 'Invalid request format',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

// Health check for the unified API
export async function GET() {
  try {
    const awsApiUrl = getApiUrl();

    // Test AWS connectivity
    const healthResponse = await fetch(`${awsApiUrl}/transcribe`, {
      method: 'GET'
    });

    return NextResponse.json({
      status: 'healthy',
      service: 'Anna Logica Unified Transcription API',
      apiGateway: healthResponse.ok ? 'connected' : 'disconnected',
      lambdaUrl: awsApiUrl,
      endpoints: {
        transcription: '/api/transcription',
        health: '/api/transcription (GET)'
      },
      features: [
        'Unified upload and transcription',
        'Real-time processing',
        'Speaker identification',
        'Timestamp generation',
        'Multi-format support'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}