const Category = require("../models/Category");
const mongoose = require("mongoose");

// Helper function to generate clean localized slugs
const generateSlug = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0980-\u09ff-]+/g, "");
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "category",
          pipeline: [{ $match: { isPublished: true } }],
          as: "publishedCourses",
        },
      },
      {
        $addFields: {
          courseCount: { $size: "$publishedCourses" },
        },
      },
      {
        $project: {
          publishedCourses: 0,
        },
      },
    ]);

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, isActive, subCategories } = req.body;

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const imageUrl = req.file.path;

    let formattedSubCategories = [];
    if (subCategories) {
      const parsedSub =
        typeof subCategories === "string"
          ? JSON.parse(subCategories)
          : subCategories;

      if (Array.isArray(parsedSub)) {
        formattedSubCategories = parsedSub.map((sub) => {
          if (typeof sub === "string") {
            return {
              name: sub,
              slug: generateSlug(sub),
              highlights: [],
            };
          }
          return {
            ...sub,
            slug: sub.slug || generateSlug(sub.name),
            admissionFee: Number(sub.admissionFee) || 0,
            oldAdmissionFee: Number(sub.oldAdmissionFee) || 0,
            monthlyFee: Number(sub.monthlyFee) || 0,
            discount: Number(sub.discount) || 0,
            highlights: Array.isArray(sub.highlights) ? sub.highlights : [],
          };
        });
      }
    }

    const category = await Category.create({
      name,
      image: imageUrl,
      description,
      isActive: isActive === "false" ? false : true,
      subCategories: formattedSubCategories,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, description, isActive, subCategories, isMainCategoryQuery } =
      req.body;
    let updateData = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined)
      updateData.isActive = isActive === "false" ? false : true;

    // 🔹 ফিক্স ১: শুধুমাত্র তখনই প্রধান ক্যাটাগরির ছবি বদলাবে যখন ফ্রন্টএন্ড থেকে 'isMainCategoryQuery' ফ্ল্যাগ আসবে
    if (req.file && isMainCategoryQuery === "true") {
      updateData.image = req.file.path;
    }

    if (subCategories) {
      const parsedSub =
        typeof subCategories === "string"
          ? JSON.parse(subCategories)
          : subCategories;

      if (Array.isArray(parsedSub)) {
        updateData.subCategories = parsedSub.map((sub) => {
          const baseSub = typeof sub === "string" ? { name: sub } : sub;

          let currentSubImage = baseSub.image || "";

          // 🔹 ফিক্স ২: ফ্রন্টএন্ড মোডাল থেকে যে সাব-ক্যাটাগটিতে 'isNewlyUploaded: true' মার্ক করা থাকবে, শুধু সেটির ইমেজই আপডেট হবে
          if (req.file && baseSub.isNewlyUploaded === true) {
            currentSubImage = req.file.path;
          }

          // ডাটাবেজে সেভ করার আগে টেম্পোরারি ফ্ল্যাগটি মুছে ফেলা
          delete baseSub.isNewlyUploaded;

          return {
            ...baseSub,
            _id: baseSub._id
              ? new mongoose.Types.ObjectId(baseSub._id)
              : new mongoose.Types.ObjectId(),
            name: baseSub.name,
            slug: baseSub.slug || generateSlug(baseSub.name),
            image: currentSubImage, // 🎯 এখন শুধুমাত্র নির্দিষ্ট উপ-বিভাগের ছবিই সেভ হবে
            fullTitle: baseSub.fullTitle || baseSub.name,
            classSchedule: baseSub.classSchedule || "",
            icon: baseSub.icon || "BookOpen",
            description: baseSub.description || "",
            isActive: baseSub.isActive !== undefined ? baseSub.isActive : true,
            admissionFee: Number(baseSub.admissionFee) || 0,
            oldAdmissionFee: Number(baseSub.oldAdmissionFee) || 0,
            monthlyFee: Number(baseSub.monthlyFee) || 0,
            discount: Number(baseSub.discount) || 0,
            coupon: baseSub.coupon || "",
            highlights: Array.isArray(baseSub.highlights)
              ? baseSub.highlights
              : [],
          };
        });
      }
    } else {
      updateData.subCategories = category.subCategories;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category/sub-category:", error);
    res.status(500).json({ message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.deleteOne();
    res
      .status(200)
      .json({ id: req.params.id, message: "Category removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCategoryByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let query = {};

    // Check if parameter matches MongoDB ObjectId format
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idOrSlug;
    } else {
      query.slug = idOrSlug;
    }

    const category = await Category.findOne(query);
    if (!category) {
      return res.status(404).json({ message: "Category parameters not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryByIdOrSlug,
};
