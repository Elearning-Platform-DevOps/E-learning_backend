const { CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");
require("dotenv").config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

module.exports = cognitoClient;
