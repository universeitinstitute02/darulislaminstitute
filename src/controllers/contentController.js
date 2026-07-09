const PageSection = require("../models/PageSection");
const HeroSlider = require("../models/HeroSlider");

// 1. Get Section Content (Public & Admin View)
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

const getFullPageContent = async (req, res) => {
  try {
    const { pageName } = req.params;
    
    const sections = await PageSection.find({ pageName });
    
    const combinedContent = {};
    sections.forEach((sec) => {
      combinedContent[sec.sectionName] = sec.content || {};
    });

    res.status(200).json({
      success: true,
      pageName,
      content: combinedContent
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update Section Content (Admin Only - Dynamic Payload Handler)
const updateSectionContent = async (req, res) => {
  try {
    const { pageName, sectionName } = req.params;

    // 1. Capture text payload (Frontend can send updated array after deleting an item)
    let contentData =
      typeof req.body.content === "string"
        ? JSON.parse(req.body.content)
        : req.body.content || {};

    // 2. Process Binary Upload Streams cleanly
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        const field = file.fieldname;

        // If field denotes a nested array update (e.g. adding new images to team_gallery)
        if (
          field === "images" ||
          field.endsWith("List") ||
          field.endsWith("Array")
        ) {
          if (!contentData[field]) {
            contentData[field] = [];
          }
          contentData[field].push(file.path);
        } else if (field.startsWith("members[")) {
          // 🎯 Advanced Nested Mapping: Handle files inside objects array (e.g., updating a specific member's image)
          // Input name template from frontend: members[0][image]
          const matches = field.match(/members\[(\d+)\]\[(\w+)\]/);
          if (
            matches &&
            contentData.members &&
            contentData.members[matches[1]]
          ) {
            const index = matches[1];
            const key = matches[2];
            contentData.members[index][key] = file.path;
          }
        } else {
          // Standard single field image upload mapping (Bypasses old asset link)
          contentData[field] = file.path;
        }
      });
    }

    // 3. Save directly to Database layer (Upsert handles instant changes)
    const updatedSection = await PageSection.findOneAndUpdate(
      { pageName, sectionName },
      { $set: { content: contentData } },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "কন্টেন্ট সফলভাবে আপডেট হয়েছে",
      data: updatedSection,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Sliders Controller Methods (Unchanged for Architecture Stability)
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
    if (!slider)
      return res.status(404).json({ message: "স্লাইডার পাওয়া যায়নি" });

    let updateData = { ...req.body };
    if (req.file) updateData.image = req.file.path;

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
  getFullPageContent,
};
