const express = require("express");
const { authenticateUser } = require("../middlewares/auth");

const router = express.Router();

// Store quiz attempt (optional - for analytics)
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { studentId, courseId, quizId, answers, score, completedAt } = req.body;
    
    console.log("📝 Quiz attempt recorded:", {
      studentId,
      courseId,
      quizId,
      score: score + "%"
    });
    
    // You can store this in a QuizAttempt collection if needed
    // For now, just return success
    res.json({ 
      message: "Quiz attempt recorded successfully",
      score 
    });
    
  } catch (error) {
    console.error("❌ Quiz attempt error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;