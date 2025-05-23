import * as cdk from "aws-cdk-lib";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  ParameterGroup,
  PostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class DbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Retrieve VPC ID from Systems Manager Parameter Store
    const vpcId = StringParameter.valueFromLookup(this, "/fb-clone/vpc-id");

    // Look up the existing VPC by its ID
    const vpc = Vpc.fromLookup(this, "ExistingVPC", { vpcId });

    const parameterGroup = new ParameterGroup(this, "CustomParameterGroup", {
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_17_4,
      }),
      parameters: {
        "rds.force_ssl": "0",
      },
    });

    const engine = DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_17_4,
    });
    const instanceType = InstanceType.of(InstanceClass.T3, InstanceSize.MICRO);
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

    // Add Inbound rule
    dbSg.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(port),
      `Allow port ${port} for database connection any ip anywhere`
    );

    // create RDS instance (PostgreSQL)
    const dbInstance = new DatabaseInstance(this, "DB-1", {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType,
      engine,
      port,
      securityGroups: [dbSg],
      databaseName: dbName,
      credentials: Credentials.fromSecret(masterUserSecret),
      backupRetention: cdk.Duration.days(0), // disable automatic DB snapshot retention
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      parameterGroup,
    });
  }
}
