const express = require("express");
const router = express.Router();
const {
  getPublicQuestions,
  submitQuizResponse,
  adminCreateQuestion,
  adminGetQuestions,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetSubmissions,
  adminDeleteSubmission,
} = require("../controllers/quizController");

const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware"); // Existing multer configuration file path

// Public routes for visitors taking tests
router.get("/questions", getPublicQuestions);
router.post("/submit", submitQuizResponse);

// Admin-only management endpoints
router.get("/admin/questions", protect, admin, adminGetQuestions);
router.post(
  "/admin/questions",
  protect,
  admin,
  upload.single("mediaFile"),
  adminCreateQuestion,
);
router.put(
  "/admin/questions/:id",
  protect,
  admin,
  upload.single("mediaFile"),
  adminUpdateQuestion,
);
router.delete("/admin/questions/:id", protect, admin, adminDeleteQuestion);
router.delete("/admin/submissions/:id", protect, admin, adminDeleteSubmission);
router.get("/admin/submissions", protect, admin, adminGetSubmissions);

module.exports = router;
