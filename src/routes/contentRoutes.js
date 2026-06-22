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
} = require("../controllers/contentController");

router.get("/page/:pageName/section/:sectionName", getSectionContent);

router.put(
  "/page/:pageName/section/:sectionName",
  protect,
  admin,
  upload.any(),
  updateSectionContent,
);

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