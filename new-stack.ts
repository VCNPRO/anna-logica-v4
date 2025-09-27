import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class AnnaLogicaNewStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function with Node.js 20
    const transcribeLambda = new lambda.Function(this, 'TranscribeFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/transcribe'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

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