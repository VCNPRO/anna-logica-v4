#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

class AnnaLogicaNewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for audio files
    const audioBucket = new s3.Bucket(this, 'AudioBucket', {
      bucketName: 'anna-logica-transcribe-audio',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda function with Node.js 20
    const transcribeLambda = new lambda.Function(this, 'TranscribeFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/transcribe'),
      timeout: cdk.Duration.minutes(15), // Increased for real transcription
      memorySize: 1024, // Increased for file processing
    });

    // Grant S3 permissions
    audioBucket.grantReadWrite(transcribeLambda);

    // Grant Amazon Transcribe permissions
    transcribeLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
        'transcribe:ListTranscriptionJobs',
        'transcribe:DeleteTranscriptionJob'
      ],
      resources: ['*']
    }));

    // Add environment variables for Lambda
    transcribeLambda.addEnvironment('S3_BUCKET', audioBucket.bucketName);

    // API Gateway
    const api = new apigateway.RestApi(this, 'TranscribeAPI', {
      restApiName: 'Anna Logica Enterprise New',
      description: 'Enterprise transcription with Node.js 20',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type'],
      },
    });

    // Add transcribe endpoint
    const transcribe = api.root.addResource('transcribe');
    transcribe.addMethod('GET', new apigateway.LambdaIntegration(transcribeLambda));
    transcribe.addMethod('POST', new apigateway.LambdaIntegration(transcribeLambda));

    // Output
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}

const app = new cdk.App();
new AnnaLogicaNewStack(app, 'AnnaLogicaNew', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});