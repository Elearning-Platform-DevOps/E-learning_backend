const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticateUser = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE DEBUG ===");
    console.log("Headers:", {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type']
    });

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Auth failed: No Bearer token");
      return res.status(401).json({ error: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    console.log("✅ Token present, length:", token.length);
    
    try {
      // Decode the JWT token (Cognito ID token)
      const decoded = jwt.decode(token);
      console.log("🔍 Token decoded:", {
        email: decoded?.email,
        'cognito:username': decoded?.['cognito:username'],
        username: decoded?.username,
        sub: decoded?.sub,
        token_use: decoded?.token_use,
        exp: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration'
      });
      
      if (!decoded) {
        console.log("❌ Auth failed: Token decode failed");
        return res.status(401).json({ error: "Invalid token format" });
      }

      // Extract email from Cognito ID token
      let userEmail = decoded.email;
      
      // If no email, try other fields
      if (!userEmail) {
        userEmail = decoded['cognito:username'] || decoded.username || decoded.sub;
      }
      
      if (!userEmail) {
        console.log("❌ Auth failed: No email/username found in token");
        return res.status(401).json({ error: "Invalid token - no user identifier" });
      }

      console.log("🔍 Looking for user with email:", userEmail);

      // Find user in MongoDB by email
      const user = await User.findOne({ email: userEmail });
      
      if (!user) {
        console.log("❌ Auth failed: User not found for email:", userEmail);
        return res.status(401).json({ error: "User not found" });
      }

      console.log("✅ User found:", {
        id: user._id,
        email: user.email,
        role: user.role,
        name: `${user.firstName} ${user.lastName}`
      });

      // Attach user info to request
      req.user = {
        _id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      };

      console.log("✅ Authentication successful");
      console.log("===============================");
      next();
    } catch (jwtError) {
      console.error("❌ JWT Error:", jwtError.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

const requireTeacher = (req, res, next) => {
  console.log("🎓 Teacher check - User:", {
    email: req.user?.email,
    role: req.user?.role,
    id: req.user?._id
  });
  
  if (!req.user) {
    console.log("❌ Teacher check failed: No user in request");
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== "teacher") {
    console.log("❌ Teacher check failed: User role is", req.user.role);
    return res.status(403).json({ error: "Teacher access required" });
  }
  
  console.log("✅ Teacher check passed");
  next();
};

const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Student access required" });
  }
  
  next();
};

module.exports = {
  authenticateUser,
  requireTeacher,
  requireStudent
};