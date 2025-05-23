import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "node:path";

export class HelloLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const fn = new lambda.Function(this, "HelloLambdaStack", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../src/lambda")),
    });
  }
}
