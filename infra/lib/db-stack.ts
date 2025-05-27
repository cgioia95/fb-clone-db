import * as cdk from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  Subnet,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  ParameterGroup,
  PostgresEngineVersion,
  StorageType,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import path = require("path");

export class DbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Retrieve VPC ID from Systems Manager Parameter Store
    const vpcId = StringParameter.valueFromLookup(this, "/fb-clone/vpc-id");

    const vpc = Vpc.fromLookup(this, "ExistingVPC", { vpcId });

    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_ISOLATED,
    });

    const parameterGroup = new ParameterGroup(this, "fb-clone-db-parameters", {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_17_4,
      }),
      parameters: {
        "rds.force_ssl": "0",
      },
    });

    const dbSecurityGroup = new SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "Allow access to RDS instance",
      allowAllOutbound: false,
    });

    // Add ingress rule to allow Lambda access within the VPC
    dbSecurityGroup.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(3000),
      "Allow Lambda access from VPC"
    );

    const engine = DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_17_4,
    });
    const instanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
    const port = 5432;
    const dbName = "fbCloneDB";

    // create database master user secret and store it in Secrets Manager
    const masterUserSecret = new Secret(
      this,
      "fb-clone-db-master-user-secret",
      {
        secretName: "fb-clone-db-master-user-secret",
        description: "FN Clone Database master user credentials",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({ username: "postgres" }),
          generateStringKey: "password",
          passwordLength: 16,
          excludePunctuation: true,
        },
      }
    );

    const dbSecretArn = masterUserSecret.secretArn;

    // Create a Security Group
    const dbSg = new SecurityGroup(this, "Database-SG", {
      securityGroupName: "Database-SG",
      vpc,
    });

    // Add Inbound rule
    dbSg.addIngressRule(
      Peer.ipv4(vpc.vpcCidrBlock),
      Port.tcp(port),
      `Allow port ${port} for database connection from only within the VPC (${vpc.vpcId})`
    );

    // create RDS instance (PostgreSQL)
    new DatabaseInstance(this, "fb-clone-db", {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      instanceType,
      engine,
      port,
      securityGroups: [dbSg],
      databaseName: dbName,
      credentials: Credentials.fromSecret(masterUserSecret),
      backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      parameterGroup,
      storageType: StorageType.STANDARD,
      allocatedStorage: 20,
      instanceIdentifier: "fb-clone-db",
    });

    const lambdaFunction = new NodejsFunction(this, "HelloLambdaFunction", {
      entry: path.join(__dirname, "../../src/lambda/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_18_X,
      vpc: vpc,
      securityGroups: [dbSecurityGroup],
      environment: {
        DB_SECRET_ARN: dbSecretArn,
      },
    });

    // Add a VPC Interface Endpoint for Secrets Manager
    const secretsManagerEndpoint = vpc.addInterfaceEndpoint(
      "SecretsManagerEndpoint",
      {
        service: {
          name: `com.amazonaws.${cdk.Aws.REGION}.secretsmanager`,
          port: 443,
        },
        subnets: privateSubnets,
        securityGroups: [dbSecurityGroup],
      }
    );

    privateSubnets.subnets.forEach((subnet: Subnet) => {
      dbSecurityGroup.addEgressRule(
        Peer.ipv4(subnet.ipv4CidrBlock),
        Port.tcp(3000),
        `Allow database traffic to Lambda subnet ${subnet.subnetId}`
      );
    });

    masterUserSecret.grantRead(lambdaFunction);
  }
}
