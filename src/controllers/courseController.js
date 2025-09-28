const Course = require("../models/Course");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

// Helper function to check course ownership
const checkCourseOwnership = async (courseId, teacherId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error("Course not found");
  }
  
  const courseTeacherId = typeof course.teacherId === 'string' 
    ? course.teacherId 
    : course.teacherId.toString();
    
  console.log("🔍 Ownership check:", {
    courseId,
    courseTeacherId,
    requestTeacherId: teacherId,
    match: courseTeacherId === teacherId
  });
    
  if (courseTeacherId !== teacherId) {
    throw new Error("You can only modify your own courses");
  }
  
  return course;
};

// Upload course thumbnail
exports.uploadThumbnail = async (req, res) => {
  const courseId = req.params.id;
  const file = req.file;

  console.log("🖼️ Thumbnail upload request:", {
    courseId,
    hasFile: !!file,
    fileName: file?.originalname,
    fileSize: file?.size,
    userId: req.user?._id,
    userRole: req.user?.role
  });

  if (!file) {
    return res.status(400).json({ error: "Thumbnail file is required" });
  }

  // Validate file type (only images)
  if (!file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed for thumbnails" });
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return res.status(400).json({ error: "File size too large. Maximum 10MB allowed." });
  }

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `thumbnails/${courseId}-${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    // Check course ownership
    console.log("🔍 Checking course ownership...");
    const course = await checkCourseOwnership(courseId, req.user._id.toString());
    console.log("✅ Ownership verified");

    // Delete old thumbnail if exists
    if (course.thumbnail && course.thumbnail.url) {
      try {
        console.log("🗑️ Deleting old thumbnail...");
        const oldKey = course.thumbnail.url.split('.com/')[1];
        const deleteParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: oldKey,
        };
        const deleteCommand = new DeleteObjectCommand(deleteParams);
        await s3.send(deleteCommand);
        console.log("✅ Old thumbnail deleted");
      } catch (deleteErr) {
        console.log("⚠️ Error deleting old thumbnail:", deleteErr.message);
        // Continue even if delete fails
      }
    }

    // Upload new thumbnail
    console.log("📤 Uploading new thumbnail to S3...");
    const command = new PutObjectCommand(params);
    await s3.send(command);

    const thumbnailUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    console.log("✅ Thumbnail uploaded to:", thumbnailUrl);

    // Update course with new thumbnail
    course.thumbnail = {
      url: thumbnailUrl,
      uploadedAt: new Date()
    };

    await course.save();
    console.log("✅ Course updated with new thumbnail");

    res.status(200).json({ 
      message: "Thumbnail uploaded successfully", 
      thumbnail: course.thumbnail 
    });
  } catch (err) {
    console.error("❌ Thumbnail upload error:", err);
    const statusCode = err.message.includes("not found") ? 404 : 
                       err.message.includes("your own") ? 403 : 500;
    res.status(statusCode).json({ error: err.message });
  }
};

// Upload lecture video
exports.uploadLecture = async (req, res) => {
  const courseId = req.params.id;
  const { title, description, order } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "Video file is required" });
  if (!title) return res.status(400).json({ error: "Lecture title is required" });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `lectures/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());

    const command = new PutObjectCommand(params);
    await s3.send(command);

    const videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

    const newLecture = {
      title,
      description: description || "",
      videoUrl,
      order: parseInt(order) || course.lectures.length,
    };

    course.lectures.push(newLecture);
    await course.save();

    res.status(200).json({ 
      message: "Lecture uploaded successfully", 
      lecture: course.lectures[course.lectures.length - 1],
      lectures: course.lectures 
    });
  } catch (err) {
    console.error("Lecture upload error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Upload material
exports.uploadMaterialToS3 = async (req, res) => {
  const courseId = req.params.id;
  const file = req.file;

  if (!file) return res.status(400).json({ error: "File is required" });

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `materials/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());

    const command = new PutObjectCommand(params);
    await s3.send(command);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

    course.materials.push({
      title: file.originalname,
      type: file.mimetype.startsWith("video") ? "video" : "pdf",
      url: fileUrl,
    });

    await course.save();

    res.status(200).json({ message: "File uploaded successfully", url: fileUrl });
  } catch (err) {
    console.error("Material upload error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Delete material from course
exports.deleteMaterial = async (req, res) => {
  const { courseId, materialIndex } = req.params;
  
  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());
    
    const index = parseInt(materialIndex);
    if (index < 0 || index >= course.materials.length) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    const material = course.materials[index];
    
    // Delete from S3
    try {
      const key = material.url.split('.com/')[1];
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    } catch (s3Error) {
      console.log("Error deleting from S3:", s3Error);
      // Continue even if S3 delete fails
    }
    
    // Remove from course
    course.materials.splice(index, 1);
    await course.save();
    
    res.status(200).json({ message: "Material deleted successfully" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Delete lecture video
exports.deleteLecture = async (req, res) => {
  const { courseId, lectureId } = req.params;

  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());

    const lectureIndex = course.lectures.findIndex(l => l._id.toString() === lectureId);
    if (lectureIndex === -1) {
      return res.status(404).json({ error: "Lecture not found" });
    }

    const lecture = course.lectures[lectureIndex];
    
    // Delete from S3
    try {
      const key = lecture.videoUrl.split('.com/')[1];
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      };
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await s3.send(deleteCommand);
    } catch (s3Error) {
      console.log("Error deleting from S3:", s3Error);
    }

    // Remove from course
    course.lectures.splice(lectureIndex, 1);
    await course.save();

    res.status(200).json({ 
      message: "Lecture deleted successfully",
      lectures: course.lectures 
    });
  } catch (err) {
    console.error("Delete lecture error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Get all lectures of a course
exports.getLecturesOfCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    res.status(200).json(course.lectures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add quiz to a course
exports.addQuizToCourse = async (req, res) => {
  const courseId = req.params.id;
  const { title, description, timeLimit, questions } = req.body;

  if (!title || !questions || !questions.length) {
    return res.status(400).json({ error: "Quiz title and questions are required" });
  }

  // Validate questions format
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.question || !q.options || q.options.length < 2) {
      return res.status(400).json({ 
        error: `Question ${i + 1}: Must have question text and at least 2 options` 
      });
    }
    if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
      return res.status(400).json({ 
        error: `Question ${i + 1}: Invalid correct answer index` 
      });
    }
  }

  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());

    const newQuiz = {
      title,
      description: description || "",
      timeLimit: timeLimit || null,
      questions: questions.map(q => ({
        question: q.question,
        type: "multiple-choice",
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points || 1,
      })),
    };

    course.quizzes.push(newQuiz);
    await course.save();

    res.status(200).json({ 
      message: "Quiz added successfully", 
      quizzes: course.quizzes 
    });
  } catch (err) {
    console.error("Add quiz error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Get all quizzes of a course
exports.getQuizzesOfCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    res.status(200).json(course.quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete quiz from course
exports.deleteQuiz = async (req, res) => {
  const { courseId, quizId } = req.params;
  
  try {
    // Check course ownership
    const course = await checkCourseOwnership(courseId, req.user._id.toString());
    
    const quizIndex = course.quizzes.findIndex(q => q._id.toString() === quizId);
    if (quizIndex === -1) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    course.quizzes.splice(quizIndex, 1);
    await course.save();
    
    res.status(200).json({ 
      message: "Quiz deleted successfully",
      quizzes: course.quizzes 
    });
  } catch (err) {
    console.error("Delete quiz error:", err);
    res.status(err.message.includes("not found") ? 404 : 
               err.message.includes("your own") ? 403 : 500)
       .json({ error: err.message });
  }
};

// Teacher creates a course
exports.createCourse = async (req, res) => {
  const { title, description, teacherId } = req.body;

  if (!title || !teacherId) {
    return res.status(400).json({ error: "Title and teacherId are required" });
  }

  // Verify the teacher ID matches the authenticated user
  if (req.user._id.toString() !== teacherId) {
    return res.status(403).json({ error: "You can only create courses for yourself" });
  }

  try {
    const course = new Course({ title, description, teacherId });
    await course.save();
    res.status(201).json({ message: "Course created successfully", course });
  } catch (err) {
    console.error("Create course error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get all courses
exports.getCourses = async (req, res) => {
  try {
    console.log("📋 Fetching all courses...");
    
    const courses = await Course.find()
      .populate("teacherId", "firstName lastName email")
      .select("title description teacherId thumbnail materials lectures quizzes createdAt")
      .lean(); // Use lean() for better performance and to ensure plain objects

    console.log("✅ Found courses:", courses.map(course => ({
      id: course._id,
      title: course.title,
      hasThumbnail: !!course.thumbnail?.url,
      thumbnailUrl: course.thumbnail?.url
    })));

    res.status(200).json(courses);
  } catch (err) {
    console.error("❌ Error fetching courses:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get course by ID
exports.getCourseById = async (req, res) => {
  try {
    console.log("🔍 Fetching course by ID:", req.params.id);
    
    const course = await Course.findById(req.params.id)
      .populate("teacherId", "firstName lastName email")
      .lean();
      
    if (!course) {
      console.log("❌ Course not found");
      return res.status(404).json({ error: "Course not found" });
    }

    console.log("✅ Course found:", {
      id: course._id,
      title: course.title,
      hasThumbnail: !!course.thumbnail?.url,
      thumbnailUrl: course.thumbnail?.url
    });

    res.status(200).json(course);
  } catch (err) {
    console.error("❌ Error fetching course:", err);
    res.status(500).json({ error: err.message });
  }
};
