import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class AnnaLogicaSimpleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Simple Lambda function
    const transcribeLambda = new lambda.Function(this, 'AnnaLogicaTranscribeLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/transcribe'),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        NODE_ENV: 'production',
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'AnnaLogicaAPI', {
      restApiName: 'Anna Logica Enterprise API',
      description: 'Enterprise-grade AI transcription service',
      deployOptions: {
        stageName: 'prod',
      },
    });

    // API endpoints
    const transcribeResource = api.root.addResource('transcribe');
    transcribeResource.addMethod('POST', new apigateway.LambdaIntegration(transcribeLambda));
    transcribeResource.addMethod('GET', new apigateway.LambdaIntegration(transcribeLambda));

    // Output the API URL
    new cdk.CfnOutput(this, 'APIUrl', {
      value: api.url,
      description: 'Anna Logica API Gateway URL',
    });
  }
}