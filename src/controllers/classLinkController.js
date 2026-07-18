const ClassLink = require("../models/ClassLink");
const Enrollment = require("../models/Enrollment");
const mongoose = require("mongoose");

// Create Class Link
const createClassLink = async (req, res) => {
  try {
    const instructorId = req.user._id;

    if (
      !req.body.course ||
      !req.body.classTitle ||
      !req.body.link ||
      !req.body.classDate ||
      !req.body.startTime ||
      !req.body.endTime
    ) {
      return res.status(400).json({ message: "সবগুলো ফিল্ড পূরণ করুন" });
    }

    const [hours, minutes] = req.body.endTime.split(":");
    const expiryDate = new Date(req.body.classDate);
    expiryDate.setHours(parseInt(hours) + 2, parseInt(minutes), 0, 0);

    const newLink = await ClassLink.create({
      ...req.body,
      instructor: instructorId,
      expiresAt: expiryDate,
    });

    res
      .status(201)
      .json({ message: "ক্লাস লিঙ্ক সফলভাবে পোস্ট হয়েছে", data: newLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Class Links
const getClassLinks = async (req, res) => {
  try {
    const links = await ClassLink.find({ instructor: req.user._id })
      .populate({
        path: "course",
        select: "title category image",
        populate: { path: "category", select: "name" },
      })
      .sort({ classDate: 1 });

    res.status(200).json(links);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Class Link
const updateClassLink = async (req, res) => {
  try {
    const { id } = req.params;
    const classLink = await ClassLink.findById(id);

    if (!classLink) {
      return res.status(404).json({ message: "লিঙ্কটি পাওয়া যায়নি" });
    }

    if (classLink.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "আপনি এই লিঙ্কটি এডিট করার যোগ্য নন" });
    }

    if (req.body.endTime || req.body.classDate) {
      const targetDate = req.body.classDate || classLink.classDate;
      const targetEndTime = req.body.endTime || classLink.endTime;

      const [hours, minutes] = targetEndTime.split(":");
      const expiryDate = new Date(targetDate);
      expiryDate.setHours(parseInt(hours) + 2, parseInt(minutes), 0, 0);

      req.body.expiresAt = expiryDate;
    }

    const updatedLink = await ClassLink.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    res
      .status(200)
      .json({ message: "লিঙ্ক সফলভাবে আপডেট হয়েছে", data: updatedLink });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentClassLinks = async (req, res) => {
  try {
    const studentId = req.user._id;

    // 1. Fetch all approved course enrollments for this specific student safely
    const approvedEnrollments = await Enrollment.find({
      student: studentId,
      status: "approved",
    }).lean();

    // If the student has zero approved courses, immediately return success true with empty data array
    if (!approvedEnrollments || approvedEnrollments.length === 0) {
      return res.status(200).json({
        success: true,
        totalCount: 0,
        data: [],
      });
    }

    // Extract course IDs safely, handling both populated and unpopulated states
    const authorizedCourseIds = approvedEnrollments
      .map((enrol) => {
        if (!enrol.course) return null;
        return enrol.course._id
          ? enrol.course._id.toString()
          : enrol.course.toString();
      })
      .filter(Boolean);

    let finalFilterCourseIds = [...authorizedCourseIds];

    // 2. Handle optional sub-filtering from frontend query params (?courseIds=ID1,ID2)
    const { courseIds } = req.query;
    if (courseIds && courseIds.trim() !== "") {
      const requestedIds = courseIds.split(",").map((id) => id.trim());
      finalFilterCourseIds = requestedIds.filter((id) =>
        authorizedCourseIds.includes(id),
      );
    }

    // Security Gate: If intersection turns out empty due to unauthorized access attempts
    if (finalFilterCourseIds.length === 0) {
      return res.status(200).json({
        success: true,
        totalCount: 0,
        data: [],
      });
    }

    // 3. Convert string array explicitly into Mongoose valid ObjectIds to prevent execution mismatch
    const mongooseCourseIds = finalFilterCourseIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Construct target match condition for the database layer query
    const queryFilter = { course: { $in: mongooseCourseIds } };

    const links = await ClassLink.find(queryFilter)
      .populate("course", "title category image")
      .populate("instructor", "name profilePicture")
      .sort({ classDate: 1, startTime: 1 });

    // 🎯 Returning exactly matching your application's MERN stack data pipeline structure
    res.status(200).json({
      success: true,
      totalCount: links.length,
      data: links,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Class Link Manually
const deleteClassLink = async (req, res) => {
  try {
    const { id } = req.params;
    const classLink = await ClassLink.findById(id);

    if (!classLink) {
      return res.status(404).json({ message: "লিঙ্কটি পাওয়া যায়নি" });
    }

    if (classLink.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "আপনি এই লিঙ্কটি ডিলিট করতে পারবেন না" });
    }

    await ClassLink.findByIdAndDelete(id);
    res.status(200).json({ message: "ক্লাস লিঙ্ক সফলভাবে ডিলিট হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClassLink,
  getClassLinks,
  updateClassLink,
  getStudentClassLinks,
  deleteClassLink,
};
