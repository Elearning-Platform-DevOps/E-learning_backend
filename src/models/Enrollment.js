const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  progress: { type: Number, default: 0 }, // % completed
  quizResults: [
    {
      quizId: { type: mongoose.Schema.Types.ObjectId },
      score: Number,
    },
  ],
  enrolledAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Enrollment", enrollmentSchema);
