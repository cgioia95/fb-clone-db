import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "node:path";

export class HelloLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new NodejsFunction(this, "HelloLambdaStack", {
      entry: path.join(__dirname, "../../src/lambda/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_LATEST,
    });
  }
}
