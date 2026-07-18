const express = require("express");
const router = express.Router();
const {
  createCampaign,
  getPublicCampaigns,
  getAdminCampaigns,
  updateCampaign,
  deleteCampaign,
  createDonation,
  getDonationLogs,
  approveDonation,
  rejectDonation,
} = require("../controllers/donationController");
const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// ==========================================
// 🌍 PUBLIC ROUTES
// ==========================================
router.post("/", createDonation);
router.get("/campaigns", getPublicCampaigns);

// ==========================================
// 🔐 ADMIN ROUTES (Campaigns/Prokolpo Management)
// ==========================================
router.post("/admin/campaigns", protect, admin, upload.single("image"), createCampaign);
router.get("/admin/campaigns", protect, admin, getAdminCampaigns);
router.put("/admin/campaigns/:id", protect, admin, upload.single("image"), updateCampaign);
router.delete("/admin/campaigns/:id", protect, admin, deleteCampaign);

// ==========================================
// 🔐 ADMIN ROUTES (Donation Logs Handling)
// ==========================================
router.get("/admin/all", protect, admin, getDonationLogs);
router.put("/admin/approve/:id", protect, admin, approveDonation);
router.put("/admin/reject/:id", protect, admin, rejectDonation);

module.exports = router;