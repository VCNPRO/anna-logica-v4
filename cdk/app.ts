#!/usr/bin/env node
// Source map support for better error traces
import * as cdk from 'aws-cdk-lib';
import { AnnaLogicaStack } from './anna-logica-stack.ts';

const app = new cdk.App();
new AnnaLogicaStack(app, 'AnnaLogicaStackV2', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});