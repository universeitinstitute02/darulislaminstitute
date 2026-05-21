const express = require("express");
const router = express.Router();
const {
  createAdminNotice,
  getAllAdminNotices,
  updateAdminNotice,
  deleteAdminNotice,
} = require("../controllers/adminNoticeController");
const { protect, admin } = require("../middlewares/authMiddleware");

router.get("/", getAllAdminNotices); // Completely Public Route

router.post("/admin/add-notice", protect, admin, createAdminNotice);
router.put("/admin/:id", protect, admin, updateAdminNotice);
router.delete("/admin/:id", protect, admin, deleteAdminNotice);

module.exports = router;