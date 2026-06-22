const Enrollment = require("../models/Enrollment");
const Batch = require("../models/Batch");
const Course = require("../models/Course");

const createEnrollmentRequest = async (req, res) => {
  try {
    const {
      courseId,
      method,
      senderName,
      bkashNumber,
      transactionId,
      amountPaid,
    } = req.body;

    const txExists = await Enrollment.findOne({
      "paymentDetails.transactionId": transactionId,
    });
    if (txExists) {
      return res
        .status(400)
        .json({ message: "This Transaction ID has already been submitted" });
    }

    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: courseId,
      paymentDetails: {
        method,
        senderName,
        bkashNumber,
        transactionId,
        amountPaid,
      },
    });

    res.status(201).json({
      success: true,
      message:
        "Enrollment request submitted successfully. Awaiting admin approval.",
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEnrollmentLogs = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const logs = await Enrollment.find(query)
      .populate("student", "name email profileImage")
      .populate("course", "title price")
      .populate("batch", "batchName maxSeats enrolledStudents")
      .sort({ createdAt: -1 })
      .lean(); // 🎯 সিনিয়র ট্রিক ১: .lean() যুক্ত করার ফলে মঙ্গুজের ইন্টারনাল মেটাডাটা প্রপার্টি রিমুভ হয়ে পিওর JS অবজেক্টে কনভার্ট হবে

    // 🎯 সিনিয়র ট্রিক ২: ডিফেন্সিভ অবজেক্ট স্যানিটাইজেশন লক (যা ফ্রন্টএন্ডের ক্র্যাশ হওয়া চিরতরে বন্ধ করবে)
    const sanitizedLogs = logs.map((log) => {
      return {
        ...log,
        // যদি ডাটাবেজে স্টুডেন্ট বা কোর্স ডিলিট হয়ে নাল থাকে, তবে ক্র্যাশ প্রটেকশন ফলব্যাক অবজেক্ট বসবে
        student: log.student || { name: "Unknown Student", email: "N/A" },
        course: log.course || { title: "Unknown Course", price: 0 },
        // যদি ব্যাচ নাল (null) বা আনডিফাইন্ড থাকে, তবে ফ্রন্টএন্ডকে ডিরেক্ট সেফ অবজেক্ট পাস করা হলো
        batch: log.batch || {
          batchName: "Not Allocated Yet",
          maxSeats: 0,
          enrolledStudents: [],
        },
      };
    });

    res.status(200).json({
      success: true,
      count: sanitizedLogs.length,
      data: sanitizedLogs, // 🎯 ফ্রন্টএন্ডের useQuery এই ডেটা রিড করবে সেফলি
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveEnrollment = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, alternateBatchId } = req.body;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment record not found" });
    }
    if (enrollment.status === "approved") {
      return res
        .status(400)
        .json({ message: "This request is already approved" });
    }

    if (!alternateBatchId) {
      return res
        .status(400)
        .json({
          message: "Please select a specific batch to allocate this student",
        });
    }

    const batch = await Batch.findById(alternateBatchId);
    if (!batch) {
      return res
        .status(404)
        .json({ message: "Assigned batch group not found" });
    }

    if (batch.enrolledStudents.length >= batch.maxSeats) {
      return res.status(400).json({
        message: `Allocation failed. ${batch.batchName} has reached maximum seat capacity (${batch.maxSeats}/${batch.maxSeats}).`,
      });
    }

    // ব্যাচে স্টুডেন্ট পুশ করা হচ্ছে
    batch.enrolledStudents.push(enrollment.student);

    if (teacherId) {
      batch.teacher = teacherId;

      await Course.findByIdAndUpdate(enrollment.course, {
        $set: { instructor: teacherId },
      });
    }
    await batch.save();

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      {
        $set: {
          batch: alternateBatchId,
          status: "approved",
          approvedAt: new Date(),
        },
      },
      { new: true, runValidators: false },
    );

    res.status(200).json({
      success: true,
      message:
        "Enrollment approved, teacher successfully synced to course, and batch slot allocated cleanly.",
      data: updatedEnrollment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment record not found" });
    }
    if (enrollment.status !== "pending") {
      return res
        .status(400)
        .json({ message: `This request is already ${enrollment.status}` });
    }

    enrollment.status = "rejected";
    await enrollment.save();

    res.status(200).json({
      success: true,
      message: "Enrollment request has been rejected successfully.",
      data: enrollment,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEnrollmentRequest,
  getEnrollmentLogs,
  approveEnrollment,
  rejectEnrollment,
};
