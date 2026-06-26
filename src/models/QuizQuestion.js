const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, "Please specify the question category"],
      enum: ["letter_recognition", "pronunciation_tajweed", "word_meaning"],
    },
    mediaType: {
      type: String,
      required: [true, "Please specify the media type"],
      enum: ["text", "image", "audio"],
      default: "text",
    },
    questionText: {
      type: String,
      required: [true, "Please add the question text"],
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    options: {
      type: [String],
      required: [true, "Please add exactly 4 options"],
      validate: [
        {
          validator: function (val) {
            return val.length === 4;
          },
          message: "A question must have exactly 4 options.",
        },
      ],
    },
    correctAnswer: {
      type: String,
      required: [true, "Please add the correct answer text"],
    },
    order: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

quizQuestionSchema.index({ order: 1 });

module.exports = mongoose.model("QuizQuestion", quizQuestionSchema);
