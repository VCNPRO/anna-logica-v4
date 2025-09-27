#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AnnaLogicaSimpleStack } from './anna-logica-simple-stack.js';

const app = new cdk.App();
new AnnaLogicaSimpleStack(app, 'AnnaLogicaSimple', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});