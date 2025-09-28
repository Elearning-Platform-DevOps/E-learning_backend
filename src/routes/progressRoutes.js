const express = require("express");
const { authenticateUser } = require("../middlewares/auth");
const {
  completeLecture,
  completeMaterial,
  completeQuiz,
  getProgress
} = require("../controllers/progressController");

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Mark content as completed
router.post("/lecture", completeLecture);
router.post("/material", completeMaterial);
router.post("/quiz", completeQuiz);

// Get progress
router.get("/:userId/:courseId", getProgress);

module.exports = router;
