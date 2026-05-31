const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  getSectionContent,
  updateSectionContent,
  getPublicSliders,
  createSlider,
  deleteSlider
} = require("../controllers/contentController");

// Static Section Routes
router.get("/page/:pageName/section/:sectionName", getSectionContent);
router.put("/page/:pageName/section/:sectionName", protect, admin, updateSectionContent);

// Hero Slider Routes
router.get("/sliders", getPublicSliders);
router.post("/sliders", protect, admin, upload.single("image"), createSlider);
router.delete("/sliders/:id", protect, admin, deleteSlider);

module.exports = router;