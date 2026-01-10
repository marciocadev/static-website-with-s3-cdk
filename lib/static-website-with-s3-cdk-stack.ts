import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { BucketWebsiteTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { join } from 'path';

/**
 * Configuração opcional do Route53 para domínio customizado
 */
export interface Route53Config {
  readonly domainName: string;
  readonly hostedZoneId: string;
  readonly subdomain?: string;
}

export interface StaticWebsiteWithS3CdkStackProps extends StackProps {
  readonly bucketName?: string;
  readonly websiteIndexDocument?: string;
  readonly websiteDirectory?: string;
  readonly exportName?: string;
  readonly route53Config?: Route53Config;
}

export const DEFAULT_BUCKET_NAME = 's3website.marciocadev.com';
export const DEFAULT_WEBSITE_INDEX_DOCUMENT = 'index.html';
export const DEFAULT_WEBSITE_DIRECTORY = './website';
export const DEFAULT_EXPORT_NAME = 'StaticWebsiteWithS3Url';

/**
 * Configuração padrão do Route53 (opcional - pode ser sobrescrita via props)
 * Valores são lidos das variáveis de ambiente do arquivo .env
 */
export const DEFAULT_ROUTE53_CONFIG: Route53Config = {
  domainName: process.env.ROUTE53_DOMAIN_NAME || 'marciocadev.com',
  hostedZoneId: process.env.ROUTE53_HOSTED_ZONE_ID || process.env.HOSTED_ZONE_ID!,
  subdomain: process.env.ROUTE53_SUBDOMAIN || 's3website',
};

/**
 * Stack CDK que cria um bucket S3 para hospedar um site estático
 */
export class StaticWebsiteWithS3CdkStack extends Stack {
  private readonly bucketName: string;
  private readonly websiteIndexDocument: string;
  private readonly websiteDirectory: string;
  private readonly exportName: string;
  private readonly bucket: Bucket;
  private readonly route53Config?: Route53Config;

  constructor(scope: Construct, id: string, props?: StaticWebsiteWithS3CdkStackProps) {
    super(scope, id, props);

    this.bucketName = props?.bucketName || DEFAULT_BUCKET_NAME;
    this.websiteIndexDocument = props?.websiteIndexDocument || DEFAULT_WEBSITE_INDEX_DOCUMENT;
    this.websiteDirectory = props?.websiteDirectory || DEFAULT_WEBSITE_DIRECTORY;
    this.exportName = props?.exportName || DEFAULT_EXPORT_NAME;
    this.route53Config = props?.route53Config || DEFAULT_ROUTE53_CONFIG;

    this.bucket = this.createWebsiteBucket();
    this.deployWebsiteFiles();

    if (this.route53Config) {
      this.createRoute53AliasRecord();
    }

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
   * Cria um registro A (alias) no Route53 que aponta o domínio para o bucket S3
   * Esta função só deve ser chamada quando route53Config estiver definido
   */
  private createRoute53AliasRecord(): void {
    const hostedZone = this.createHostedZoneReference();
    this.createAliasRecord(hostedZone);
  }

  /**
   * Cria uma referência à Hosted Zone do Route53 usando os atributos configurados
   * Pré-condição: route53Config deve estar definido
   */
  private createHostedZoneReference(): IHostedZone {
    if (!this.route53Config) {
      throw new Error('route53Config deve estar definido para criar a referência da Hosted Zone');
    }

    const zoneName = this.buildZoneName();

    return HostedZone.fromHostedZoneAttributes(this, 'WebsiteHostedZone', {
      hostedZoneId: this.route53Config.hostedZoneId,
      zoneName: zoneName,
    });
  }

  /**
   * Constrói o nome da zona DNS baseado no domínio e subdomínio configurados
   * Pré-condição: route53Config deve estar definido
   * @returns Nome completo da zona (ex: 's3website.marciocadev.com')
   */
  private buildZoneName(): string {
    if (!this.route53Config) {
      throw new Error('route53Config deve estar definido para construir o nome da zona');
    }

    const { domainName, subdomain } = this.route53Config;

    if (subdomain) {
      return `${subdomain}.${domainName}`;
    }

    return domainName;
  }

  /**
   * Cria o registro A (alias) que aponta o domínio para o bucket S3
   */
  private createAliasRecord(hostedZone: IHostedZone): void {
    new ARecord(this, 'WebsiteAliasRecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new BucketWebsiteTarget(this.bucket)),
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
