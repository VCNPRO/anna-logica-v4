// AWS Configuration - Centralized
export const AWS_CONFIG = {
  // Unified Lambda URL - only one source of truth
  LAMBDA_URL: 'https://8y4y77gkgl.execute-api.us-east-1.amazonaws.com/prod',

  // S3 Configuration
  S3_BUCKET: 'anna-logica-transcribe-audio',

  // AWS Region
  REGION: 'us-east-1',

  // API Endpoints
  ENDPOINTS: {
    TRANSCRIBE: '/transcribe',
    HEALTH: '/health'
  }
} as const;

// Helper function to get full endpoint URL
export function getEndpointUrl(endpoint: keyof typeof AWS_CONFIG.ENDPOINTS): string {
  return `${AWS_CONFIG.LAMBDA_URL}${AWS_CONFIG.ENDPOINTS[endpoint]}`;
}

// Environment variables fallback
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_AWS_API_GATEWAY_URL || AWS_CONFIG.LAMBDA_URL;
}