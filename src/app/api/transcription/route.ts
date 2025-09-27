import { NextResponse } from 'next/server';

// SOLUCIÓN #1: ARQUITECTURA UNIFICADA
// Ruta única que maneja todo el flujo de transcripción
export async function POST(request: Request) {
  try {
    console.log('🚀 Anna Logica - Flujo de Transcripción Unificado');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Información del archivo
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;

    console.log(`📁 Procesando: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`🔄 Tipo: ${fileType}`);

    // URL CORRECTA del Lambda
    const AWS_LAMBDA_URL = 'https://8y4y77gkgl.execute-api.us-east-1.amazonaws.com/prod';
    console.log(`🌐 Llamando AWS Lambda: ${AWS_LAMBDA_URL}/transcribe`);

    // Preparar FormData para Lambda
    const lambdaFormData = new FormData();
    lambdaFormData.append('file', file);
    lambdaFormData.append('fileName', fileName);
    lambdaFormData.append('fileType', fileType);

    const lambdaResponse = await fetch(`${AWS_LAMBDA_URL}/transcribe`, {
      method: 'POST',
      body: lambdaFormData
    });

    if (!lambdaResponse.ok) {
      console.error('❌ Error AWS Lambda:', lambdaResponse.status, lambdaResponse.statusText);

      return NextResponse.json({
        success: false,
        error: 'Servicio de transcripción no disponible',
        statusCode: lambdaResponse.status
      }, { status: 500 });
    }

    const result = await lambdaResponse.json();
    console.log('✅ Transcripción AWS completada');

    // Respuesta unificada
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
      provider: 'Anna Logica Enterprise - AWS Transcribe Unificado',
      processingInfo: {
        ...result.processingInfo,
        originalFileName: fileName,
        originalFileSize: fileSize,
        originalFileType: fileType,
        timestamp: new Date().toISOString(),
        apiVersion: 'v1-unified',
        lambdaUrl: AWS_LAMBDA_URL
      }
    });

  } catch (error) {
    console.error('🚨 Error en transcripción:', error);

    return NextResponse.json({
      success: false,
      error: 'Error procesando transcripción',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Health check para la API unificada
export async function GET() {
  try {
    const AWS_LAMBDA_URL = 'https://8y4y77gkgl.execute-api.us-east-1.amazonaws.com/prod';

    // Test conectividad AWS
    const healthResponse = await fetch(`${AWS_LAMBDA_URL}/transcribe`, {
      method: 'GET'
    });

    return NextResponse.json({
      status: 'healthy',
      service: 'Anna Logica API Transcripción Unificada',
      apiGateway: healthResponse.ok ? 'connected' : 'disconnected',
      lambdaUrl: AWS_LAMBDA_URL,
      endpoints: {
        transcription: '/api/transcription',
        health: '/api/transcription (GET)'
      },
      features: [
        'Upload y transcripción unificado',
        'Procesamiento en tiempo real',
        'Identificación de speakers',
        'Generación de timestamps',
        'Soporte multi-formato'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}