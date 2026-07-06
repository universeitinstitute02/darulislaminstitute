const express = require("express");
const router = express.Router();
const {
  addGalleryImage,
  getAdminGallery,
  getPublicGallery,
  updateGalleryText,
  deleteGalleryImage,
} = require("../controllers/galleryController");
const { protect, admin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.get("/", getPublicGallery);

// Route handles conditional multipart data arrays seamlessly
router.post(
  "/admin/add-image",
  protect,
  admin,
  upload.array("image", 10),
  addGalleryImage,
);
router.put("/admin/:id", protect, admin, updateGalleryText);
router.get("/admin/my-gallery", protect, admin, getAdminGallery);
router.delete("/admin/:id", protect, admin, deleteGalleryImage);

module.exports = router;