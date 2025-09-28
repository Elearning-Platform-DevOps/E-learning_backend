const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course", 
    required: true 
  },
  
  // Completed content tracking
  completedLectures: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Lecture" 
  }],
  completedMaterials: [String], // Material titles since they don't have IDs
  completedQuizzes: [{ 
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
    score: Number,
    completedAt: { type: Date, default: Date.now }
  }],
  
  // Overall progress
  progressPercentage: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  },
  
  // Timestamps
  lastAccessed: { 
    type: Date, 
    default: Date.now 
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: Date
}, {
  timestamps: true
});

// Ensure one progress record per user per course
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
