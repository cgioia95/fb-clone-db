#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DbStack } from "../lib/db-stack";

const app = new cdk.App();
new DbStack(app, "DbStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
