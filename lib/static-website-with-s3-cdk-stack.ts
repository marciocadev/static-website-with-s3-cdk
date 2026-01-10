import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { join } from 'path';

export interface StaticWebsiteWithS3CdkStackProps extends StackProps {
  readonly bucketName: string;
  readonly websiteIndexDocument: string;
  readonly websiteDirectory: string;
  readonly exportName: string;
}

export const DEFAULT_BUCKET_NAME = 'static-website-with-cdk';
export const DEFAULT_WEBSITE_INDEX_DOCUMENT = 'index.html';
export const DEFAULT_WEBSITE_DIRECTORY = './website';
export const DEFAULT_EXPORT_NAME = 'static-website-with-s3-url';

/**
 * Stack CDK que cria um bucket S3 para hospedar um site estático
 */
export class StaticWebsiteWithS3CdkStack extends Stack {
  private readonly bucketName: string;
  private readonly websiteIndexDocument: string;
  private readonly websiteDirectory: string;
  private readonly exportName: string;
  private readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props?: StaticWebsiteWithS3CdkStackProps) {
    super(scope, id, props);

    this.bucketName = props?.bucketName || DEFAULT_BUCKET_NAME;
    this.websiteIndexDocument = props?.websiteIndexDocument || DEFAULT_WEBSITE_INDEX_DOCUMENT;
    this.websiteDirectory = props?.websiteDirectory || DEFAULT_WEBSITE_DIRECTORY;
    this.exportName = props?.exportName || DEFAULT_EXPORT_NAME;
    this.bucket = this.createWebsiteBucket();
    this.deployWebsiteFiles();
    this.createOutputs();
  }

  /**
   * Cria o bucket S3 configurado para hospedar um site estático
   */
  private createWebsiteBucket(): Bucket {
    return new Bucket(this, 'WebsiteBucket', {
      bucketName: this.bucketName,
      websiteIndexDocument: this.websiteIndexDocument,
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS_ONLY,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  /**
   * Faz o deploy dos arquivos estáticos para o bucket S3
   */
  private deployWebsiteFiles(): void {
    const websitePath = join(__dirname, this.websiteDirectory);

    new BucketDeployment(this, 'WebsiteBucketDeployment', {
      sources: [Source.asset(websitePath)],
      destinationBucket: this.bucket,
    });
  }

  /**
   * Cria as saídas (outputs) da stack
   */
  private createOutputs(): void {
    new CfnOutput(this, 'WebsiteUrl', {
      value: this.bucket.bucketWebsiteUrl,
      exportName: this.exportName,
    });
  }
}
