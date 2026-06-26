// models/QuizSubmission.js
const mongoose = require("mongoose");

const quizSubmissionSchema = new mongoose.Schema(
  {
    visitorDetails: {
      name: {
        type: String,
        required: [true, "Visitor name is required to start the test"],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "Visitor mobile number is required to start the test"],
        trim: true,
      },
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "QuizQuestion",
          required: true,
        },
        selectedAnswer: {
          type: String,
          default: null, // null if skipped
        },
        isCorrect: {
          type: Boolean,
          required: true,
          default: false,
        },
      },
    ],
    scoreSummary: {
      letterScore: { type: Number, default: 0 },
      pronunciationScore: { type: Number, default: 0 },
      meaningScore: { type: Number, default: 0 },
      totalScore: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    surveyResponses: {
      knowsReading: {
        type: String,
        default: "not_specified",
      },
      namazFocus: {
        type: String,
        default: "not_specified",
      },
      userFacingProblems: {
        type: String,
        default: "",
      },
    },
    suggestedCourse: {
      type: String,
      default: "Basic Quran Shikhha Course",
    },
  },
  {
    timestamps: true,
  },
);

quizSubmissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("QuizSubmission", quizSubmissionSchema);