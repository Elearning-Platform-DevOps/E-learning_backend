const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  videoUrl: { type: String, required: true },
  duration: String, // e.g., "12:30"
  order: Number,
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  thumbnail: { 
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }, // NEW: Course thumbnail
  materials: [
    {
      title: String,
      type: { type: String, enum: ["video", "pdf"] },
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  quizzes: [
    {
      title: String,
      description: String,
      timeLimit: Number, // in minutes, optional
      questions: [
        {
          question: String,
          type: { type: String, enum: ["multiple-choice"], default: "multiple-choice" },
          options: [String], // Array of option texts
          correctAnswer: Number, // Index of correct option (0, 1, 2, 3...)
          points: { type: Number, default: 1 },
        },
      ],
      createdAt: { type: Date, default: Date.now },
    },
  ],
  lectures: [lectureSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Course", courseSchema);
