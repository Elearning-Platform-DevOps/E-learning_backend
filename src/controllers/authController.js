const {
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand, // <-- add
} = require("@aws-sdk/client-cognito-identity-provider");
const cognitoClient = require("../config/cognito");
const User = require("../models/User"); // MongoDB model

exports.signup = async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({
      error: "Email, password, firstName, lastName, and role are required."
    });
  }

  try {
    const command = new SignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: `${firstName} ${lastName}` },
      ],
    });

    const response = await cognitoClient.send(command);

    const newUser = new User({
      cognitoSub: response.UserSub,
      email,
      firstName,
      lastName,
      role,
    });

    await newUser.save();

    res.status(200).json({ message: "Signup successful. Please verify your email." });
  } catch (err) {
    const code = err.name || "AuthError";
    const status =
      code === "UsernameExistsException" ? 409 :
      code === "InvalidPasswordException" ? 400 :
      400;
    res.status(status).json({ error: err.message, code });
  }
};

exports.verify = async (req, res) => {
  const { email, code } = req.body;
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });
    await cognitoClient.send(command);
    res.status(200).json({ message: "Email verified successfully." });
  } catch (err) {
    const code = err.name || "AuthError";
    const status =
      code === "CodeMismatchException" ? 400 :
      code === "ExpiredCodeException" ? 400 :
      400;
    res.status(status).json({ error: err.message, code });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    });
    const response = await cognitoClient.send(command);

    // CRITICAL: Find user by email and return role info
    const user = await User.findOne({ email }).select("_id role firstName lastName email");
    
    if (!user) {
      return res.status(404).json({ 
        error: "User not found in database", 
        code: "UserNotFoundInDB" 
      });
    }

    res.status(200).json({
      message: "Login successful",
      tokens: response.AuthenticationResult,
      user: {
        id: user._id.toString(), // Make sure it's a string
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }
    });
  } catch (err) {
    console.error("Login error:", err); // Add logging
    const code = err.name || "AuthError";
    const status =
      code === "UserNotConfirmedException" ? 403 :
      code === "NotAuthorizedException" ? 401 :
      code === "UserNotFoundException" ? 404 :
      400;
    res.status(status).json({ error: err.message, code });
  }
};

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required.", code: "BadRequest" });
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
    });
    await cognitoClient.send(command);
    res.json({ message: "A new verification code has been sent to your email." });
  } catch (err) {
    const code = err.name || "AuthError";
    const status =
      code === "UserNotFoundException" ? 404 :
      code === "LimitExceededException" ? 429 :
      code === "TooManyRequestsException" ? 429 :
      400;
    res.status(status).json({ error: err.message, code });
  }
};
