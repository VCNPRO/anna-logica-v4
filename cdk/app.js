#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Source map support for better error traces
const cdk = require("aws-cdk-lib");
const anna_logica_stack_1 = require("./anna-logica-stack");
const app = new cdk.App();
new anna_logica_stack_1.AnnaLogicaStack(app, 'AnnaLogicaStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});
