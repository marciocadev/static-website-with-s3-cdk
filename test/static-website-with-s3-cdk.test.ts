import * as cdk from 'aws-cdk-lib/core';
import { Match, MatchResult, Template } from 'aws-cdk-lib/assertions';
import { StaticWebsiteWithS3CdkStack } from '../lib/static-website-with-s3-cdk-stack';

describe('StaticWebsiteWithS3CdkStack', () => {
  let app: cdk.App;
  let stack: StaticWebsiteWithS3CdkStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new StaticWebsiteWithS3CdkStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('deve criar um bucket S3 configurado para website estático', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      WebsiteConfiguration: {
        IndexDocument: 'index.html',
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: false,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: false,
      },
    });
  });

  test('deve configurar o bucket para deletar objetos automaticamente', () => {
    template.hasResourceProperties('Custom::S3AutoDeleteObjects', {
      BucketName: {
        Ref: Match.stringLikeRegexp('^[a-zA-Z0-9-]+$'),
      },
      ServiceToken: {
        "Fn::GetAtt": [
          Match.stringLikeRegexp('^[a-zA-Z0-9-]+$'),
          'Arn'
        ]
      },
    });
  });

  test('deve criar uma política de bucket para acesso público de leitura', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: {
              AWS: '*'
            },
            Action: 's3:GetObject',
          }),
        ]),
      },
    });
  });

  test('deve criar um BucketDeployment para fazer deploy dos arquivos', () => {
    template.hasResourceProperties('Custom::CDKBucketDeployment', Match.objectLike({
      DestinationBucketName: {
        Ref: Match.stringLikeRegexp('^[a-zA-Z0-9-]+$'),
      },
    }));
  });

  test('deve criar um output com a URL do website', () => {
    template.hasOutput('WebsiteUrl', {
      Export: {
        Name: 'static-website-with-s3-url',
      },
    });
  });
});
