const PageSection = require("../models/PageSection");
const HeroSlider = require("../models/HeroSlider");

const getSectionContent = async (req, res) => {
  try {
    const { pageName, sectionName } = req.params;
    const section = await PageSection.findOne({ pageName, sectionName });
    if (!section) {
      return res.status(200).json({ pageName, sectionName, content: {} });
    }
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSectionContent = async (req, res) => {
  try {
    const { pageName, sectionName } = req.params;

    let contentData =
      typeof req.body.content === "string"
        ? JSON.parse(req.body.content)
        : req.body.content || {};

    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        contentData[file.fieldname] = file.path;
      });
    }

    const updatedSection = await PageSection.findOneAndUpdate(
      { pageName, sectionName },
      { $set: { content: contentData } },
      { new: true, upsert: true, runValidators: true },
    );

    res
      .status(200)
      .json({ message: "কন্টেন্ট সফলভাবে আপডেট হয়েছে", data: updatedSection });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicSliders = async (req, res) => {
  try {
    const page = req.query.page || "landing";
    const sliders = await HeroSlider.find({
      pageName: page,
      isActive: true,
    }).sort({ order: 1 });
    res.status(200).json(sliders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSlider = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "ছবি আপলোড করা আবশ্যক" });
    const newSlider = await HeroSlider.create({
      ...req.body,
      image: req.file.path,
    });
    res.status(201).json(newSlider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSlider = async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await HeroSlider.findById(id);

    if (!slider) {
      return res.status(404).json({ message: "স্লাইডার পাওয়া যায়নি" });
    }

    let updateData = { ...req.body };

    if (req.file) {
      updateData.image = req.file.path;
    }

    const updatedSlider = await HeroSlider.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json(updatedSlider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSlider = async (req, res) => {
  try {
    const slider = await HeroSlider.findById(req.params.id);
    if (!slider)
      return res.status(404).json({ message: "স্লাইডার পাওয়া যায়নি" });
    await slider.deleteOne();
    res.status(200).json({ message: "স্লাইডার ডিলিট হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSectionContent,
  updateSectionContent,
  getPublicSliders,
  createSlider,
  updateSlider,
  deleteSlider,
};