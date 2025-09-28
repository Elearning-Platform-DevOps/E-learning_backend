const Enrollment = require("../models/Enrollment");
const Progress = require("../models/Progress");
const Course = require("../models/Course");

// Create enrollment and initialize progress
const createEnrollment = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    console.log("📝 Creating enrollment:", { studentId, courseId });

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ studentId, courseId });
    if (existingEnrollment) {
      return res.status(400).json({ error: "Already enrolled in this course" });
    }

    // Create enrollment
    const enrollment = new Enrollment({ studentId, courseId });
    await enrollment.save();

    // Initialize progress record
    const progress = new Progress({ 
      userId: studentId, 
      courseId,
      progressPercentage: 0
    });
    await progress.save();

    console.log("✅ Enrollment and progress created");
    res.status(201).json({ 
      message: "Enrolled successfully", 
      enrollment,
      progress: 0
    });
  } catch (err) {
    console.error("❌ Enrollment creation error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get enrollments by student with real progress
const getEnrollmentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log("📚 Fetching enrollments with progress for student:", studentId);

    const enrollments = await Enrollment.find({ studentId })
      .populate({
        path: "courseId",
        populate: {
          path: "teacherId",
          select: "firstName lastName email"
        },
        select: "title description teacherId thumbnail materials lectures quizzes createdAt"
      })
      .lean();

    // Get real progress for each enrollment
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await Progress.findOne({ 
          userId: studentId, 
          courseId: enrollment.courseId._id 
        });
        
        return {
          ...enrollment,
          progress: progress?.progressPercentage || 0,
          lastAccessed: progress?.lastAccessed,
          isCompleted: progress?.progressPercentage === 100
        };
      })
    );

    console.log("✅ Found enrollments with progress:", enrollmentsWithProgress.map(e => ({
      course: e.courseId.title,
      progress: e.progress + "%"
    })));

    res.status(200).json(enrollmentsWithProgress);
  } catch (err) {
    console.error("❌ Error fetching enrollments:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get enrollments by course
const getEnrollmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log("👥 Fetching students for course:", courseId);

    const enrollments = await Enrollment.find({ courseId })
      .populate("studentId", "firstName lastName email")
      .lean();

    // Get progress for each student
    const enrollmentsWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await Progress.findOne({ 
          userId: enrollment.studentId._id, 
          courseId 
        });
        
        return {
          ...enrollment,
          progress: progress?.progressPercentage || 0,
          lastAccessed: progress?.lastAccessed,
          isCompleted: progress?.progressPercentage === 100
        };
      })
    );

    console.log("✅ Found students with progress");
    res.status(200).json(enrollmentsWithProgress);
  } catch (err) {
    console.error("❌ Error fetching course enrollments:", err);
    res.status(500).json({ error: err.message });
  }
};

// IMPORTANT: Export as an object with named properties
module.exports = {
  createEnrollment,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse
};
