const mongoose = require("mongoose");

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique: true,
    },
    teacherNameBn: { type: String, trim: true },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Please select a department (Bivag)"],
      ref: "Category",
    },
    designation: {
      type: String,
      required: [true, "Please add a designation"],
    },
    biography: {
      type: String,
    },
    experience: {
      type: String,
    },
    qualifications: {
      type: String,
    },
    isApproved: {
      type: Boolean,
      default: false, // Waiting approval for admin
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("TeacherProfile", teacherProfileSchema);
