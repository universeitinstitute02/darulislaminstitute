const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryByIdOrSlug,
} = require("../controllers/categoryController");
const upload = require("../middlewares/uploadMiddleware");

// Import both middlewares
const { protect, admin } = require("../middlewares/authMiddleware");

// GET Category
router.get("/", getCategories);

router.get("/:idOrSlug", getCategoryByIdOrSlug);

// POST request Admin Verify
router.post("/", protect, admin, upload.single("image"), createCategory);

// Update & Delete Category (admin)
router.put("/:id", protect, admin, upload.single("image"), updateCategory);
router.delete("/:id", protect, admin, deleteCategory);

module.exports = router;