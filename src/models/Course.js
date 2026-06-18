const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a course title"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Please add a thumbnail image URL"],
    },
    // Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    // Sub Category
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.courseCategoryType === "academic";
      },
    },
    // Course Type
    courseCategoryType: {
      type: String,
      required: [true, "Please specify course category type"],
      enum: ["academic", "general"],
      default: "general",
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    // জেনারেল (নন-অ্যাকাডেমিক) কোর্সের জন্য সরাসরি ফি স্ট্রাকচার:
    price: {
      type: Number,
      default: 0,
    },
    oldPrice: {
      type: Number,
      default: 0,
    },
    label: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "0 hours",
    },
    courseType: {
      type: String,
      required: [true, "Please specify course type"],
      default: "Online", // Online, Offline
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    modules: [
      {
        title: {
          type: String,
          required: [true, "Please specify a module title"],
          trim: true,
        },
        statusType: {
          type: String,
          default: "live_class",
        },
        statusText: {
          type: String,
          default: "",
        },
      },
    ],
    details: {
      fullTitle: { type: String },
      description: { type: String },
      admissionFee: { type: Number, default: 0 },
      oldAdmissionFee: { type: Number, default: 0 },
      monthlyFee: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      coupon: { type: String },
      batchInfo: { type: String },
      highlights: [
        {
          label: { type: String },
          value: { type: String },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Course || mongoose.model("Course", courseSchema);