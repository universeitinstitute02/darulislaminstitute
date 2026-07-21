const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    reviewerName: {
      type: String,
      required: [true, "Please add the reviewer name"],
    },
    text: {
      type: String,
      required: [true, "Please add the testimonial text"],
      maxlength: [500, "Testimonial cannot be more than 500 characters"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    identityImage: {
      type: String,
      default: null,
    },
    userType: {
      type: String,
      required: [true, "Please specify the author user type"],
      enum: ["student", "teacher", "female_teacher", "parent"],
      default: "student",
    },
    courseName: {
      type: String,
      default: "",
    },
    batchName: {
      type: String,
      default: "",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Testimonial", testimonialSchema);