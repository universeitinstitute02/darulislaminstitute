const QuizQuestion = require("../models/QuizQuestion");
const QuizSubmission = require("../models/QuizSubmission");

// @desc    Get all questions for visitors (Sorted by order, hides correct answer)
// @route   GET /api/quiz/questions
// @access  Public
const getPublicQuestions = async (req, res) => {
  try {
    const questions = await QuizQuestion.find({})
      .sort({ order: 1 })
      .select("-correctAnswer")
      .lean();

    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit quiz responses, calculate score, save submission lead
// @route   POST /api/quiz/submit
// @access  Public
const submitQuizResponse = async (req, res) => {
  try {
    const { visitorDetails, userAnswers, surveyResponses } = req.body;

    if (!visitorDetails?.name || !visitorDetails?.phone) {
      return res.status(400).json({
        success: false,
        message: "Visitor name and phone are required.",
      });
    }

    const questionIds = userAnswers.map((ans) => ans.questionId);
    const databaseQuestions = await QuizQuestion.find({
      _id: { $in: questionIds },
    }).lean();

    let letterScore = 0;
    let pronunciationScore = 0;
    let meaningScore = 0;
    let totalScore = 0;

    const formattedAnswers = userAnswers.map((userAns) => {
      const matchedQ = databaseQuestions.find(
        (q) => q._id.toString() === userAns.questionId.toString(),
      );

      const isCorrect =
        matchedQ && userAns.selectedAnswer === matchedQ.correctAnswer;

      if (isCorrect) {
        totalScore += 1;
        if (matchedQ.category === "letter_recognition") letterScore += 1;
        if (matchedQ.category === "pronunciation_tajweed")
          pronunciationScore += 1;
        if (matchedQ.category === "word_meaning") meaningScore += 1;
      }

      return {
        questionId: userAns.questionId,
        selectedAnswer: userAns.selectedAnswer || null,
        isCorrect: !!isCorrect,
      };
    });

    // Dynamic course recommendation rule matrix
    let suggestedCourse = "Basic Quran Shikhha Course";
    if (totalScore >= 6) {
      suggestedCourse = "Advanced Tajweed & Sura Memorization Course";
    }

    const submission = await QuizSubmission.create({
      visitorDetails,
      answers: formattedAnswers,
      scoreSummary: {
        letterScore,
        pronunciationScore,
        meaningScore,
        totalScore,
      },
      surveyResponses,
      suggestedCourse,
    });

    res.status(201).json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new quiz question
// @route   POST /api/quiz/admin/questions
// @access  Private (Admin)
const adminCreateQuestion = async (req, res) => {
  try {
    const { category, mediaType, questionText, options, correctAnswer, order } =
      req.body;

    let mediaUrl = null;

    // 🎯 আপনি যদি multer-storage-cloudinary ব্যবহার করেন, তবে ফাইল আপলোড শেষে Cloudinary সরাসরি 'path' বা 'secure_url' দেয়
    if (req.file) {
      mediaUrl = req.file.path || req.file.secure_url || req.file.filename;
    }

    const parsedOptions =
      typeof options === "string" ? JSON.parse(options) : options;

    const question = await QuizQuestion.create({
      category,
      mediaType,
      questionText,
      options: parsedOptions,
      correctAnswer,
      order: Number(order) || 1,
      mediaUrl, // এখানে ক্লাউডিনারির গ্লোবাল অডিও লিংকটি সেভ হবে
    });

    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all questions with correct answers for management panel
// @route   GET /api/quiz/admin/questions
// @access  Private (Admin)
const adminGetQuestions = async (req, res) => {
  try {
    const questions = await QuizQuestion.find({}).sort({ order: 1 }).lean();
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a quiz question
// @route   PUT /api/quiz/admin/questions/:id
// @access  Private (Admin)
const adminUpdateQuestion = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.mediaUrl = req.file.path || req.file.filename;
    }

    if (updates.options && typeof updates.options === "string") {
      updates.options = JSON.parse(updates.options);
    }

    const question = await QuizQuestion.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a quiz question
// @route   DELETE /api/quiz/admin/questions/:id
// @access  Private (Admin)
const adminDeleteQuestion = async (req, res) => {
  try {
    const question = await QuizQuestion.findByIdAndDelete(req.params.id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all quiz submission leads
// @route   GET /api/quiz/admin/submissions
// @access  Private (Admin)
const adminGetSubmissions = async (req, res) => {
  try {
    const submissions = await QuizSubmission.find({})
      .sort({ createdAt: -1 })
      .populate("answers.questionId", "questionText category")
      .lean();
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminDeleteSubmission = async (req, res) => {
  try {
    const submission = await QuizSubmission.findByIdAndDelete(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }
    
    res.status(200).json({ success: true, message: "Submission deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  getPublicQuestions,
  submitQuizResponse,
  adminCreateQuestion,
  adminGetQuestions,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetSubmissions,
  adminDeleteSubmission,
};
