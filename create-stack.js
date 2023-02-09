// @ts-check

import {
  App,
  aws_autoscaling,
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_ec2,
  aws_elasticloadbalancingv2,
  aws_iam,
  aws_lambda,
  aws_lambda_nodejs,
  aws_logs,
  aws_s3_assets,
  Duration,
  RemovalPolicy,
  Stack,
} from 'aws-cdk-lib';

const app = new App();

const stack = new Stack(app, `streaming-lambda-test`, {
  stackName: `streaming-lambda-test`,
  env: {account: process.env.CDK_DEFAULT_ACCOUNT, region: `us-east-1`},
});

const defaultVpc = aws_ec2.Vpc.fromLookup(stack, 'default-vpc', {
  isDefault: true,
});

const securityGroup = new aws_ec2.SecurityGroup(stack, 'security-group', {
  vpc: defaultVpc,
});

securityGroup.addIngressRule(
  aws_ec2.Peer.anyIpv4(),
  aws_ec2.Port.tcp(80),
  'Allow HTTP access from the Internet',
);

const role = new aws_iam.Role(stack, 'ec2-role', {
  assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
});

const userData = aws_ec2.UserData.forLinux();

const proxyServerZip = new aws_s3_assets.Asset(stack, 'proxy-server-zip', {
  path: `./src/proxy`,
});

proxyServerZip.grantRead(role);

const proxyServerZipFilename = userData.addS3DownloadCommand({
  bucket: proxyServerZip.bucket,
  bucketKey: proxyServerZip.s3ObjectKey,
});

const configScript = new aws_s3_assets.Asset(stack, 'config-script', {
  path: './src/proxy/configure_amz_linux.sh',
});

configScript.grantRead(role);

const configScriptFilename = userData.addS3DownloadCommand({
  bucket: configScript.bucket,
  bucketKey: configScript.s3ObjectKey,
});

userData.addExecuteFileCommand({
  filePath: configScriptFilename,
  arguments: proxyServerZipFilename,
});

const ec2LaunchTemplate = new aws_ec2.LaunchTemplate(
  stack,
  'ec2-launch-template',
  {
    instanceType: aws_ec2.InstanceType.of(
      aws_ec2.InstanceClass.T2,
      aws_ec2.InstanceSize.MICRO,
    ),
    machineImage: aws_ec2.MachineImage.latestAmazonLinux({
      generation: aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    }),
    securityGroup,
    userData,
    role,
  },
);

const loadBalancer = new aws_elasticloadbalancingv2.ApplicationLoadBalancer(
  stack,
  'load-balancer',
  {vpc: defaultVpc, securityGroup, internetFacing: true},
);

const autoScalingGroup = new aws_autoscaling.AutoScalingGroup(
  stack,
  'autoscaling-group',
  {
    vpc: defaultVpc,
    launchTemplate: ec2LaunchTemplate,
    minCapacity: 0,
    maxCapacity: 2,
    autoScalingGroupName: 'streaming-lambda',
  },
);

const targetGroup = new aws_elasticloadbalancingv2.ApplicationTargetGroup(
  stack,
  `application-target-group`,
  {vpc: defaultVpc, port: 80, targets: [autoScalingGroup]},
);

loadBalancer.addListener(`http-listener`, {
  protocol: aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
  defaultTargetGroups: [targetGroup],
});

new aws_cloudfront.Distribution(stack, 'cdn', {
  defaultBehavior: {
    origin: new aws_cloudfront_origins.LoadBalancerV2Origin(loadBalancer, {
      protocolPolicy: aws_cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    }),
    cachePolicy: aws_cloudfront.CachePolicy.CACHING_DISABLED,
  },
});

const lambdaFunction = new aws_lambda_nodejs.NodejsFunction(stack, `function`, {
  functionName: `streaming-test`,
  runtime: aws_lambda.Runtime.NODEJS_18_X,
  entry: `./src/handler/index.ts`,
  bundling: {
    format: aws_lambda_nodejs.OutputFormat.ESM,
    minify: true,
    sourceMap: true,
  },
  insightsVersion: aws_lambda.LambdaInsightsVersion.VERSION_1_0_143_0,
  timeout: Duration.seconds(30),
  vpc: defaultVpc,
  securityGroups: [securityGroup],
  allowPublicSubnet: true,
});

lambdaFunction.grantInvoke(role);

new aws_logs.LogGroup(stack, 'function-log-group', {
  logGroupName: `/aws/lambda/${lambdaFunction.functionName}`,
  removalPolicy: RemovalPolicy.DESTROY,
  retention: aws_logs.RetentionDays.ONE_WEEK,
});
