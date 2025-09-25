"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnaLogicaStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const s3 = require("aws-cdk-lib/aws-s3");
const efs = require("aws-cdk-lib/aws-efs");
const ec2 = require("aws-cdk-lib/aws-ec2");
const iam = require("aws-cdk-lib/aws-iam");
class AnnaLogicaStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // VPC for EFS and Lambda
        const vpc = new ec2.Vpc(this, 'AnnaLogicaVPC', {
            maxAzs: 2,
            natGateways: 1,
        });
        // EFS for large file storage
        const fileSystem = new efs.FileSystem(this, 'AnnaLogicaEFS', {
            vpc,
            lifecyclePolicy: efs.LifecyclePolicy.AFTER_30_DAYS,
            performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
            throughputMode: efs.ThroughputMode.BURSTING,
        });
        // S3 bucket for final storage
        const bucket = new s3.Bucket(this, 'AnnaLogicaBucket', {
            bucketName: 'anna-logica-enterprise-storage',
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            lifecycleRules: [
                {
                    id: 'DeleteOldVersions',
                    expiration: cdk.Duration.days(365),
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
        });
        // FFmpeg Lambda Layer (we'll build this)
        const ffmpegLayer = new lambda.LayerVersion(this, 'FFmpegLayer', {
            layerVersionName: 'ffmpeg-layer',
            code: lambda.Code.fromAsset('layers/ffmpeg'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
            description: 'FFmpeg binaries for audio/video processing',
        });
        // Lambda execution role with EFS and S3 permissions
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
            ],
        });
        // Add permissions for EFS and S3
        bucket.grantReadWrite(lambdaRole);
        fileSystem.grantRootAccess(lambdaRole);
        // Access point for EFS
        const accessPoint = new efs.AccessPoint(this, 'AnnaLogicaAccessPoint', {
            fileSystem,
            path: '/mnt/scriptorium',
        });
        // Main transcription Lambda
        const transcribeLambda = new lambda.Function(this, 'AnnaLogicaTranscribeLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/transcribe'),
            timeout: cdk.Duration.minutes(15),
            memorySize: 3008, // Max memory for enterprise processing
            role: lambdaRole,
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            layers: [ffmpegLayer],
            environment: {
                BUCKET_NAME: bucket.bucketName,
                EFS_MOUNT_PATH: '/mnt/efs',
                GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
                NODE_ENV: 'production',
            },
        });
        // Upload Lambda for chunked uploads
        const uploadLambda = new lambda.Function(this, 'AnnaLogicaUploadLambda', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/upload'),
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
            role: lambdaRole,
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                EFS_MOUNT_PATH: '/mnt/efs',
            },
        });
        // API Gateway
        const api = new apigateway.RestApi(this, 'AnnaLogicaAPI', {
            restApiName: 'Anna Logica Enterprise API',
            description: 'Enterprise-grade AI transcription and analysis service',
            binaryMediaTypes: ['*/*'],
            deployOptions: {
                stageName: 'prod',
            },
        });
        // API endpoints
        const transcribeResource = api.root.addResource('transcribe');
        transcribeResource.addMethod('POST', new apigateway.LambdaIntegration(transcribeLambda), {
            authorizationType: apigateway.AuthorizationType.NONE,
            requestParameters: {
                'method.request.header.Content-Type': true,
            },
        });
        const uploadResource = api.root.addResource('upload');
        uploadResource.addMethod('POST', new apigateway.LambdaIntegration(uploadLambda), {
            authorizationType: apigateway.AuthorizationType.NONE,
        });
        const uploadChunkResource = uploadResource.addResource('chunk');
        uploadChunkResource.addMethod('POST', new apigateway.LambdaIntegration(uploadLambda), {
            authorizationType: apigateway.AuthorizationType.NONE,
        });
        // Outputs
        new cdk.CfnOutput(this, 'APIUrl', {
            value: api.url,
            description: 'Anna Logica API Gateway URL',
        });
        new cdk.CfnOutput(this, 'S3Bucket', {
            value: bucket.bucketName,
            description: 'S3 Bucket for file storage',
        });
    }
}
exports.AnnaLogicaStack = AnnaLogicaStack;
