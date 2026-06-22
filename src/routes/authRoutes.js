const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  googleLogin,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const { protect } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.post("/register", upload.single("profileImage"), registerUser);
router.post("/login", loginUser);
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
