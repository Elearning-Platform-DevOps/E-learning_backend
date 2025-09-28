const express = require("express");
const router = express.Router();
const {
  createCourse,
  getCourses,
  getCourseById,
  uploadMaterialToS3,
  addQuizToCourse,
  getQuizzesOfCourse,
  deleteMaterial,
  deleteQuiz,
  uploadLecture,
  deleteLecture,
  getLecturesOfCourse,
  uploadThumbnail
} = require("../controllers/courseController");
const { authenticateUser, requireTeacher } = require("../middlewares/auth");
const multer = require("multer");

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Teacher-only routes (protected)
router.post("/", authenticateUser, requireTeacher, createCourse);
router.post("/:id/materials", authenticateUser, requireTeacher, upload.single("file"), uploadMaterialToS3);
router.post("/:id/quizzes", authenticateUser, requireTeacher, addQuizToCourse);
router.post("/:id/lectures", authenticateUser, requireTeacher, upload.single("video"), uploadLecture);
router.post("/:id/thumbnail", authenticateUser, requireTeacher, upload.single("thumbnail"), uploadThumbnail);

// Delete routes (teacher only)
router.delete("/:courseId/materials/:materialIndex", authenticateUser, requireTeacher, deleteMaterial);
router.delete("/:courseId/quizzes/:quizId", authenticateUser, requireTeacher, deleteQuiz);
router.delete("/:courseId/lectures/:lectureId", authenticateUser, requireTeacher, deleteLecture);

// Public routes
router.get("/", getCourses);
router.get("/:id", getCourseById);
router.get("/:id/quizzes", getQuizzesOfCourse);
router.get("/:id/lectures", getLecturesOfCourse);

module.exports = router;
