const express = require("express");
const router = express.Router();
const {
  createNotice,
  updateNotice,
  getInstructorNotices,
  getStudentNotices,
  deleteNotice,
} = require("../controllers/teacherNoticeController");
const { protect, instructor } = require("../middlewares/authMiddleware");

router.post("/teacher/add-notice", protect, instructor, createNotice);
router.get("/teacher/my-notices", protect, instructor, getInstructorNotices);
router.put("/teacher/:id", protect, instructor, updateNotice);
router.delete("/teacher/delete-notice/:id", protect, instructor, deleteNotice);
router.get("/student/my-notices", protect, getStudentNotices);

module.exports = router;