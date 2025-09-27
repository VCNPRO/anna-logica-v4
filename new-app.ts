#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AnnaLogicaNewStack } from './new-stack';

const app = new cdk.App();
new AnnaLogicaNewStack(app, 'AnnaLogicaNew', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});