import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { join } from 'path';

export class StaticWebsiteWithS3CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "StaticWebsiteWithS3Bucket", {
      bucketName: "static-website-with-cdk",
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "StaticWebsiteWithS3BucketDeployment", {
      sources: [Source.asset(join(__dirname, "./website"))],
      destinationBucket: bucket
    });

    new CfnOutput(this, "StaticWebsiteWithS3Url", {
      value: bucket.bucketWebsiteUrl,
      exportName: "static-website-with-s3-url"
    })
  }
}
