const Testimonial = require("../models/Testimonial");

const createTestimonial = async (req, res) => {
  try {
    const { reviewerName, text, rating, userType, courseName, batchName } =
      req.body;

    let identityImage = null;
    if (req.file) {
      identityImage = req.file.path || req.file.location || req.file.filename;
    }

    const testimonial = await Testimonial.create({
      reviewerName,
      text,
      rating: Number(rating) || 5,
      userType: userType || "student",
      courseName: userType === "student" ? courseName : "",
      batchName: userType === "student" ? batchName : "",
      identityImage,
      isApproved: true,
    });

    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPublicTestimonials = async (req, res) => {
  try {
    const { userType, rating } = req.query;
    const queryCondition = { isApproved: true };

    if (userType) {
      queryCondition.userType = userType;
    }
    if (rating) {
      queryCondition.rating = Number(rating);
    }

    const testimonials = await Testimonial.find(queryCondition).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminTestimonials = async (req, res) => {
  try {
    const { userType, isApproved } = req.query;
    const queryCondition = {};

    if (userType) queryCondition.userType = userType;
    if (isApproved) queryCondition.isApproved = isApproved === "true";

    const testimonials = await Testimonial.find(queryCondition).sort({
      createdAt: -1,
    });

    res.status(200).json({ success: true, data: testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateApprovalStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true, runValidators: true },
    );

    if (!testimonial) {
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });
    }

    res.status(200).json({ success: true, data: testimonial });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res
        .status(404)
        .json({ success: false, message: "Testimonial not found" });
    }

    await testimonial.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Testimonial removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTestimonial,
  getPublicTestimonials,
  getAdminTestimonials,
  updateApprovalStatus,
  deleteTestimonial,
};
