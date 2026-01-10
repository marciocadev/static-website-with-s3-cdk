#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { StaticWebsiteWithS3CdkStack } from '../lib/static-website-with-s3-cdk-stack';

const app = new cdk.App();

new StaticWebsiteWithS3CdkStack(app, 'StaticWebsiteWithS3CdkStack', {
  // Para configurar Account/Region específicos, descomente uma das opções abaixo:
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  // env: { account: '123456789012', region: 'us-east-1' },
});
