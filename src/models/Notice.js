const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Notice description content is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["urgent", "important", "general"],
      default: "general",
    },
    category: {
      type: String,
      enum: ["holiday", "class", "exam", "admission", "event", "others"],
      default: "others",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notice", noticeSchema);
