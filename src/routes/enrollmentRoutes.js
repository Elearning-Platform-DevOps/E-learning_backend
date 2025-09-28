const express = require("express");
const { authenticateUser } = require("../middlewares/auth");
const {
  createEnrollment,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse
} = require("../controllers/enrollmentController");

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Create new enrollment
router.post("/", createEnrollment);  // Line 12 - This should be a function

// Get enrollments by student
router.get("/student/:studentId", getEnrollmentsByStudent);

// Get enrollments by course
router.get("/course/:courseId", getEnrollmentsByCourse);

module.exports = router;
