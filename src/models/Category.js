const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a category name"],
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Please add a category image URL"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subCategories: [
      {
        name: {
          type: String,
          required: [true, "Please add a sub-category name"],
          trim: true,
        },
        slug: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        image: {
          // 🔹 নতুন রিকোয়ারমেন্ট ফিক্স: সাব-ক্যাটাগরির নিজস্ব কোর্স ইমেজ ফিল্ড
          type: String,
          default: "",
        },
        icon: {
          type: String,
          default: "BookOpen",
        },
        description: {
          type: String,
          trim: true,
          default: "",
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        fullTitle: {
          type: String,
          default: "",
        },
        admissionFee: {
          type: Number,
          default: 0,
        },
        oldAdmissionFee: {
          type: Number,
          default: 0,
        },
        monthlyFee: {
          type: Number,
          default: 0,
        },
        discount: {
          type: Number,
          default: 0,
        },
        coupon: {
          type: String,
          default: "",
        },
        classSchedule: {
          type: String,
          default: "",
        },
        highlights: [
          {
            label: { type: String },
            value: { type: String },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);