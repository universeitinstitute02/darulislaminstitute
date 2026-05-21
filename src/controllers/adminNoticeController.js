const Notice = require("../models/Notice"); // Uses the original Notice collection

const createAdminNotice = async (req, res) => {
  try {
    const { title, description, category, type, pinned } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Mandatory fields cannot be left empty" });
    }
    const newNotice = await Notice.create({
      title,
      description,
      category: category || "others",
      type,
      pinned,
      admin: req.user._id,
    });
    res.status(201).json({
      message: "Global institutional notice published successfully",
      data: newNotice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAdminNotices = async (req, res) => {
  try {
    const notices = await Notice.find({}).sort({ pinned: -1, createdAt: -1 });
    res.status(200).json({ totalCount: notices.length, data: notices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminNotice = async (req, res) => {
  try {
    const updatedNotice = await Notice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!updatedNotice)
      return res.status(404).json({ message: "Notice entry not found" });
    res.status(200).json({
      message: "Global notice updated successfully",
      data: updatedNotice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminNotice = async (req, res) => {
  try {
    const deleted = await Notice.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Notice entry not found" });
    res.status(200).json({ message: "Global notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAdminNotice,
  getAllAdminNotices,
  updateAdminNotice,
  deleteAdminNotice,
};
