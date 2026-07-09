const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  getSectionContent,
  updateSectionContent,
  getPublicSliders,
  createSlider,
  updateSlider,
  deleteSlider,
  getFullPageContent,
} = require("../controllers/contentController");

// Public Dynamic Content Retrieval Node API
router.get("/page/:pageName/section/:sectionName", getSectionContent);

router.get("/page/:pageName/all-sections", getFullPageContent);

// Admin Dynamic Section Update Endpoint Core Gateway
router.put(
  "/page/:pageName/section/:sectionName",
  protect,
  admin,
  upload.any(), // Captures all incoming key-value files streams neatly
  updateSectionContent,
);

// Sliders Core Routing Boundaries
router.get("/sliders", getPublicSliders);
router.post("/sliders", protect, admin, upload.single("image"), createSlider);
router.put(
  "/sliders/:id",
  protect,
  admin,
  upload.single("image"),
  updateSlider,
);
router.delete("/sliders/:id", protect, admin, deleteSlider);

module.exports = router;
