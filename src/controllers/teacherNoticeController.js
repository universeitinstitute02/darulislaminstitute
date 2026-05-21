const TeacherNotice = require("../models/TeacherNotice");

const createNotice = async (req, res) => {
  try {
    if (!req.body.title || !req.body.description || !req.body.course) {
      return res
        .status(400)
        .json({ message: "Mandatory fields cannot be left empty" });
    }
    const newNotice = await TeacherNotice.create({
      ...req.body,
      instructor: req.user._id,
    });
    res
      .status(201)
      .json({ message: "Notice published successfully", data: newNotice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNotice = async (req, res) => {
  try {
    const notice = await TeacherNotice.findById(req.params.id);
    if (!notice)
      return res.status(404).json({ message: "Notice data entry not found" });

    if (notice.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized alteration request" });
    }

    const updatedNotice = await TeacherNotice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Notice updated successfully", data: updatedNotice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInstructorNotices = async (req, res) => {
  try {
    const notices = await TeacherNotice.find({ instructor: req.user._id })
      .populate("course", "name category banner")
      .sort({ pinned: -1, createdAt: -1 });

    const stats = {
      totalNotice: notices.length,
      urgent: notices.filter((n) => n.type === "urgent").length,
      pinned: notices.filter((n) => n.pinned === true).length,
    };
    res.status(200).json({ stats, data: notices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentNotices = async (req, res) => {
  try {
    const { courseIds } = req.query;
    const queryFilter = {};
    if (courseIds) {
      queryFilter.course = { $in: courseIds.split(",").map((id) => id.trim()) };
    }
    const notices = await TeacherNotice.find(queryFilter)
      .populate("course", "title category banner")
      .populate("instructor", "name profilePicture")
      .sort({ pinned: -1, createdAt: -1 });

    res.status(200).json({ totalCount: notices.length, data: notices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const notice = await TeacherNotice.findById(req.params.id);
    if (!notice)
      return res.status(404).json({ message: "Notice data entry not found" });

    if (notice.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized destruction request" });
    }
    await TeacherNotice.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createNotice,
  updateNotice,
  getInstructorNotices,
  getStudentNotices,
  deleteNotice,
};