import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

export const handler = async (event: any): Promise<any> => {
  const secretsManager = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });

  const secretArn = process.env.DB_SECRET_ARN!;

  try {
    const secretValueResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    const secretString = secretValueResponse.SecretString;

    if (!secretString) {
      throw new Error(
        "SecretString is undefined. Could not retrieve the database credentials."
      );
    }

    const dbCredentials = JSON.parse(secretString);
    const username = dbCredentials.username;
    const password = dbCredentials.password;

    console.log(`Database username: ${username}`);
    // Use these credentials to connect to the database

    // Your Lambda logic here

    return { statusCode: 200, body: "Success" };
  } catch (error) {
    console.error(`Error retrieving secret: ${error}`);
    return { statusCode: 500, body: "Failed to retrieve secret." };
  }
};
