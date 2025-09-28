const Progress = require("../models/Progress");
const Course = require("../models/Course");

// Mark lecture as completed
const completeLecture = async (req, res) => {
  try {
    const { userId, courseId, lectureId } = req.body;

    console.log("🎥 Marking lecture as completed:", { userId, courseId, lectureId });

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
      console.log("📝 Created new progress record");
    }

    // Check if lecture is already completed
    const alreadyCompleted = progress.completedLectures.includes(lectureId);
    
    // Add lecture if not already completed
    if (!alreadyCompleted) {
      progress.completedLectures.push(lectureId);
      console.log("📚 Added lecture to completed list");
    } else {
      console.log("📚 Lecture was already completed");
    }

    // Always recalculate progress percentage
    progress.progressPercentage = await calculateProgressPercentage(courseId, progress);
    progress.lastAccessed = new Date();
    
    if (progress.progressPercentage === 100 && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    await progress.save();

    console.log("✅ Lecture completion saved:", {
      progressPercentage: progress.progressPercentage,
      completedLectures: progress.completedLectures.length,
      isCompleted: progress.progressPercentage === 100,
      alreadyCompleted
    });

    // Return comprehensive response
    res.json({ 
      message: alreadyCompleted ? "Lecture was already completed" : "Lecture marked as completed", 
      progress: progress.progressPercentage,
      isCompleted: progress.progressPercentage === 100,
      completedLectures: progress.completedLectures.map(id => id.toString()),
      completedMaterials: progress.completedMaterials,
      completedQuizzes: progress.completedQuizzes.map(cq => ({
        quizId: cq.quizId.toString(),
        score: cq.score,
        completedAt: cq.completedAt
      })),
      wasAlreadyCompleted: alreadyCompleted
    });
  } catch (error) {
    console.error("❌ Complete lecture error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Mark material as completed
const completeMaterial = async (req, res) => {
  try {
    const { userId, courseId, materialTitle } = req.body;

    console.log("📄 Marking material as completed:", { userId, courseId, materialTitle });

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
      console.log("📝 Created new progress record");
    }

    // Check if material is already completed
    const alreadyCompleted = progress.completedMaterials.includes(materialTitle);

    if (!alreadyCompleted) {
      progress.completedMaterials.push(materialTitle);
      console.log("📚 Added material to completed list");
    } else {
      console.log("📚 Material was already completed");
    }

    // Always recalculate progress percentage
    progress.progressPercentage = await calculateProgressPercentage(courseId, progress);
    progress.lastAccessed = new Date();

    if (progress.progressPercentage === 100 && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    await progress.save();

    console.log("✅ Material completion saved:", {
      progressPercentage: progress.progressPercentage,
      completedMaterials: progress.completedMaterials.length,
      isCompleted: progress.progressPercentage === 100,
      alreadyCompleted
    });

    // Return comprehensive response
    res.json({ 
      message: alreadyCompleted ? "Material was already completed" : "Material marked as completed", 
      progress: progress.progressPercentage,
      isCompleted: progress.progressPercentage === 100,
      completedLectures: progress.completedLectures.map(id => id.toString()),
      completedMaterials: progress.completedMaterials,
      completedQuizzes: progress.completedQuizzes.map(cq => ({
        quizId: cq.quizId.toString(),
        score: cq.score,
        completedAt: cq.completedAt
      })),
      wasAlreadyCompleted: alreadyCompleted
    });
  } catch (error) {
    console.error("❌ Complete material error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Mark quiz as completed
const completeQuiz = async (req, res) => {
  try {
    const { userId, courseId, quizId, score } = req.body;

    console.log("🎯 Marking quiz as completed:", { userId, courseId, quizId, score });

    let progress = await Progress.findOne({ userId, courseId });
    if (!progress) {
      progress = new Progress({ userId, courseId });
      console.log("📝 Created new progress record");
    }

    const existingQuizIndex = progress.completedQuizzes.findIndex(
      cq => cq.quizId.toString() === quizId
    );

    let wasUpdated = false;
    if (existingQuizIndex >= 0) {
      if (score > progress.completedQuizzes[existingQuizIndex].score) {
        progress.completedQuizzes[existingQuizIndex].score = score;
        progress.completedQuizzes[existingQuizIndex].completedAt = new Date();
        console.log("🔄 Updated existing quiz score");
        wasUpdated = true;
      } else {
        console.log("📝 Quiz already completed with better or equal score");
      }
    } else {
      progress.completedQuizzes.push({
        quizId,
        score,
        completedAt: new Date()
      });
      console.log("📝 Added quiz to completed list");
      wasUpdated = true;
    }

    // Always recalculate progress percentage
    progress.progressPercentage = await calculateProgressPercentage(courseId, progress);
    progress.lastAccessed = new Date();

    if (progress.progressPercentage === 100 && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    await progress.save();

    console.log("✅ Quiz completion saved:", {
      progressPercentage: progress.progressPercentage,
      completedQuizzes: progress.completedQuizzes.length,
      isCompleted: progress.progressPercentage === 100,
      wasUpdated
    });

    res.json({ 
      message: wasUpdated ? "Quiz completed successfully" : "Quiz was already completed with better score", 
      progress: progress.progressPercentage,
      score,
      isCompleted: progress.progressPercentage === 100,
      completedLectures: progress.completedLectures.map(id => id.toString()),
      completedMaterials: progress.completedMaterials,
      completedQuizzes: progress.completedQuizzes.map(cq => ({
        quizId: cq.quizId.toString(),
        score: cq.score,
        completedAt: cq.completedAt
      })),
      wasUpdated
    });
  } catch (error) {
    console.error("❌ Complete quiz error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get progress for a specific course and user
const getProgress = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    
    console.log("📊 Getting progress for:", { userId, courseId });
    
    const progress = await Progress.findOne({ userId, courseId })
      .populate('completedQuizzes.quizId', 'title')
      .populate('completedLectures', 'title');
    
    if (!progress) {
      console.log("📊 No progress found, returning empty progress");
      return res.json({ 
        progressPercentage: 0, 
        completedLectures: [], 
        completedMaterials: [], 
        completedQuizzes: [],
        lastAccessed: null,
        startedAt: null,
        completedAt: null
      });
    }

    console.log("📊 Progress found:", {
      progressPercentage: progress.progressPercentage,
      completedLectures: progress.completedLectures.length,
      completedMaterials: progress.completedMaterials.length,
      completedQuizzes: progress.completedQuizzes.length
    });

    // Return the complete progress object with proper string conversion
    res.json({
      progressPercentage: progress.progressPercentage,
      completedLectures: progress.completedLectures.map(lecture => 
        lecture._id ? lecture._id.toString() : lecture.toString()
      ),
      completedMaterials: progress.completedMaterials,
      completedQuizzes: progress.completedQuizzes.map(cq => ({
        quizId: cq.quizId._id ? cq.quizId._id.toString() : cq.quizId.toString(),
        score: cq.score,
        completedAt: cq.completedAt
      })),
      lastAccessed: progress.lastAccessed,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt
    });
  } catch (error) {
    console.error("❌ Get progress error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to calculate progress percentage
async function calculateProgressPercentage(courseId, progress) {
  try {
    console.log("🧮 Calculating progress percentage for course:", courseId);
    
    const course = await Course.findById(courseId);
    if (!course) {
      console.log("❌ Course not found");
      return 0;
    }

    const totalLectures = course.lectures?.length || 0;
    const totalMaterials = course.materials?.length || 0;
    const totalQuizzes = course.quizzes?.length || 0;
    
    const completedLectures = progress.completedLectures.length;
    const completedMaterials = progress.completedMaterials.length;
    const completedQuizzes = progress.completedQuizzes.length;

    const totalContent = totalLectures + totalMaterials + totalQuizzes;
    
    console.log("📊 Progress calculation:", {
      totalLectures, completedLectures,
      totalMaterials, completedMaterials, 
      totalQuizzes, completedQuizzes,
      totalContent
    });
    
    if (totalContent === 0) {
      console.log("⚠️ No content found in course");
      return 0;
    }

    const completedContent = completedLectures + completedMaterials + completedQuizzes;
    const percentage = Math.round((completedContent / totalContent) * 100);
    
    console.log(`✅ Progress calculated: ${completedContent}/${totalContent} = ${percentage}%`);
    
    return percentage;
  } catch (error) {
    console.error("❌ Calculate progress error:", error);
    return 0;
  }
}

module.exports = {
  completeLecture,
  completeMaterial,
  completeQuiz,
  getProgress
};
