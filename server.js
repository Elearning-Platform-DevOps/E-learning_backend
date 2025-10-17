const express = require("express");
const path = require("path");

// Load .env from the correct location
require("dotenv").config({ path: path.join(__dirname, '.env') });

const cors = require("cors");

// Validate critical environment variables
const requiredEnvVars = ['MONGO_URI', 'AWS_REGION', 'COGNITO_CLIENT_ID'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

console.log("✅ Environment variables loaded:", {
  MONGO_URI: process.env.MONGO_URI ? '***hidden***' : 'MISSING',
  AWS_REGION: process.env.AWS_REGION,
  PORT: process.env.PORT
});

// Update these paths - add "./src/" prefix
const authRoutes = require("./src/routes/authRoutes");
const courseRoutes = require("./src/routes/courseRoutes");
const enrollmentRoutes = require("./src/routes/enrollmentRoutes");
const progressRoutes = require("./src/routes/progressRoutes");
const quizAttemptRoutes = require("./src/routes/quizAttemptRoutes");

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

// ADD THIS HEALTH ENDPOINT - CRITICAL FOR ALB!
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).json(healthcheck);
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/enrollments", enrollmentRoutes);
app.use("/progress", progressRoutes);
app.use("/quiz-attempts", quizAttemptRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
