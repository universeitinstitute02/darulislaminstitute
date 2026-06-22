const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  adminUpdateUser,
  adminDeleteUser,
  updateUserRole,
  approveTeacher,
  getTeacherStudents, // 🎯 নতুন কন্ট্রোলার ইমপোর্ট
} = require("../controllers/userController");
const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// Admin User Management Routes
router.get("/admin/all-users", protect, admin, getAllUsers);
router.get("/admin/single-user/:id", protect, admin, getUserById);
router.put(
  "/admin/update-user/:id",
  upload.single("profileImage"),
  protect,
  admin,
  adminUpdateUser,
);
router.delete("/admin/delete-user/:id", protect, admin, adminDeleteUser);

// Explicit State Updates
router.put("/admin/update-role/:id", protect, admin, updateUserRole);
router.put("/admin/approve-teacher/:id", protect, admin, approveTeacher);

// ==========================================
// Teacher Dynamic Operations
// ==========================================
// 🎯 নতুন সিকিউর রাউট: শিক্ষক তাঁর আন্ডারের শিক্ষার্থীদের তালিকা দেখতে পারবেন
router.get("/teacher/my-students", protect, getTeacherStudents);

module.exports = router;