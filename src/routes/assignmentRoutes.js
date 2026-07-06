const express = require("express");
const router = express.Router();
const {
  createAssignment,
  getInstructorSubmissions,
  evaluateSubmission,
  getEvaluationStats,
  getStudentAssignments,
  submitAssignment,
  getStudentResults,
  getTeacherCreatedAssignments,
  updateAssignment,
  deleteAssignment,
} = require("../controllers/assignmentController");
const { protect, instructor } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Instructor Management Nodes
router.post("/teacher/create", protect, instructor, createAssignment);
router.get("/teacher/stats", protect, instructor, getEvaluationStats);
router.get(
  "/teacher/submissions",
  protect,
  instructor,
  getInstructorSubmissions,
);
router.get(
  "/teacher/my-created",
  protect,
  instructor,
  getTeacherCreatedAssignments,
);
router.put("/teacher/update/:id", protect, instructor, updateAssignment);
router.patch(
  "/teacher/evaluate/:submissionId",
  protect,
  instructor,
  evaluateSubmission,
);
router.delete("/teacher/delete/:id", protect, instructor, deleteAssignment);

// Student Pipeline Nodes
router.get("/student/feed", protect, getStudentAssignments);
router.post(
  "/student/submit",
  protect,
  upload.array("submittedImages", 10),
  submitAssignment,
);
router.get("/student/results", protect, getStudentResults);

module.exports = router;
