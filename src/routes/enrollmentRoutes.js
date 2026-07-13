const express = require("express");
const router = express.Router();
const {
  createEnrollmentRequest,
  getEnrollmentLogs,
  approveEnrollment,
  rejectEnrollment,
  manualEnrollByAdmin,
  deleteEnrollment,
} = require("../controllers/enrollmentController");
const { protect, admin } = require("../middlewares/authMiddleware");

// Student Operations
router.post("/enroll-course", protect, createEnrollmentRequest);

router.post("/manual-enroll", protect, admin, manualEnrollByAdmin);

// Admin dashboard routes
router.get("/admin/all", protect, admin, getEnrollmentLogs);
router.put("/admin/approve/:id", protect, admin, approveEnrollment);
router.put("/admin/reject/:id", protect, admin, rejectEnrollment);

router.delete("/:id", protect, admin, deleteEnrollment);

module.exports = router;