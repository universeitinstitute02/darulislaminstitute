const express = require("express");
const router = express.Router();

const {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  forgotPassword,
  resetPassword,
  getMe,
  googleLogin,
  updateProfile,
  changePassword,
  manualUserAddByAdmin,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.post("/admin/add-user", protect, upload.single("profileImage"), manualUserAddByAdmin);
router.post("/register", upload.single("profileImage"), registerUser);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);
router.get("/me", protect, getMe);

router.put(
  "/update-profile",
  protect,
  upload.single("profileImage"),
  updateProfile,
);
router.put("/change-password", protect, changePassword);

module.exports = router;