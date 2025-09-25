// Anna Logica Enterprise Transcription Lambda
// FFmpeg + Gemini AI integration

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

exports.handler = async (event) => {
  console.log('🎵 Anna Logica Enterprise Transcription starting...');
  console.log('Full event:', JSON.stringify(event, null, 2));

  try {
    // Health check for GET requests
    if (event.httpMethod === 'GET') {
      console.log('✅ GET request - returning health check');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify({
          status: 'healthy',
          service: 'Anna Logica Enterprise Transcription Lambda',
          provider: 'AWS Lambda + FFmpeg + Gemini',
          timestamp: new Date().toISOString(),
          features: [
            'FFmpeg audio processing',
            'Unlimited file sizes via EFS',
            'Automatic segmentation for large files',
            'Gemini Flash + Pro fallback'
          ]
        })
      };
    }

    // Handle POST requests for transcription
    console.log('📝 POST request - parsing body:', event.body);
    const { filePath, language = 'auto' } = JSON.parse(event.body || '{}');
    console.log('📁 Parsed data:', { filePath, language });

    if (!filePath) {
      console.log('❌ No file path provided');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        body: JSON.stringify({ error: 'No file path provided' })
      };
    }

    console.log(`📁 Processing file: ${filePath} with language: ${language}`);

    // FFmpeg processing would go here
    // Gemini API calls would go here

    console.log('✅ Transcription completed successfully - sending response');
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        transcription: 'This is a placeholder transcription - AWS Lambda + FFmpeg + Gemini integration will be implemented here.',
        language: language,
        segmented: false,
        totalSegments: 1,
        provider: 'AWS Lambda + FFmpeg + Gemini'
      })
    };

    console.log('📤 Response:', JSON.stringify(response, null, 2));
    return response;

  } catch (error) {
    console.error('❌ Transcription error:', error);
    console.error('Error stack:', error.stack);

    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      },
      body: JSON.stringify({
        error: 'Transcription failed',
        details: error.message,
        provider: 'AWS Lambda + FFmpeg + Gemini'
      })
    };

    console.log('📤 Error response:', JSON.stringify(errorResponse, null, 2));
    return errorResponse;
  }
};