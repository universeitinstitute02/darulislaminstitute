const StudentProfile = require("../models/StudentProfile");
const Batch = require("../models/Batch");
const Enrollment = require("../models/Enrollment");

const toBanglaNumber = (num) => {
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num)
    .split("")
    .map((digit) => banglaDigits[digit] || digit)
    .join("");
};

const calculateAgeBn = (birthDateStr) => {
  if (!birthDateStr) return "তথ্য নেই";

  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return "তথ্য নেই";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age > 0 ? `${toBanglaNumber(age)} বছর` : "১ বছরের কম";
};

const getPublicStudents = async (req, res) => {
  try {
    const limitCount = req.query.limit ? parseInt(req.query.limit) : 0;
    const { search, classLevel } = req.query;

    let profileFilter = { isFeatured: true };
    if (classLevel) profileFilter.classLevel = classLevel;
    if (search) profileFilter.studentNameBn = { $regex: search, $options: "i" };

    const students = await StudentProfile.find(profileFilter)
      .populate(
        "user",
        "name email phone profileImage birthDate permanentAddress gender",
      )
      .populate("department", "name")
      .sort({ createdAt: -1 })
      .limit(limitCount);

    const resolvedStudents = students
      .filter((student) => student.user !== null)
      .map((student) => {
        const studentObj = student.toObject();
        return {
          ...studentObj,
          address: studentObj.user?.permanentAddress || "তথ্য নেই",
          age: calculateAgeBn(studentObj.user?.birthDate),
        };
      });

    res.status(200).json(resolvedStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleStudentFeatured = async (req, res) => {
  try {
    const { isFeatured } = req.body;

    const profile = await StudentProfile.findByIdAndUpdate(
      req.params.id,
      { isFeatured },
      { new: true, runValidators: true },
    );

    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Student featured status updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEnrolledCourses = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Already Approved Batch students
    const activeBatches = await Batch.find({
      enrolledStudents: studentId,
    }).populate({
      path: "course",
      populate: {
        path: "instructor",
        select: "name email profileImage",
      },
    });

    // Get Pending Courses
    const pendingEnrollments = await Enrollment.find({
      student: studentId,
      status: "pending",
    }).populate({
      path: "course",
      populate: {
        path: "instructor",
        select: "name email profileImage",
      },
    });

    const coursesMap = new Map();

    // Map Approved Courses
    activeBatches.forEach((batch) => {
      if (batch.course && !coursesMap.has(batch.course._id.toString())) {
        coursesMap.set(batch.course._id.toString(), {
          ...batch.course.toObject(),
          enrollmentStatus: "approved",
        });
      }
    });

    // Add Pending Courses to Map
    pendingEnrollments.forEach((enrollment) => {
      if (
        enrollment.course &&
        !coursesMap.has(enrollment.course._id.toString())
      ) {
        coursesMap.set(enrollment.course._id.toString(), {
          ...enrollment.course.toObject(),
          enrollmentStatus: "pending",
        });
      }
    });

    const allCourses = Array.from(coursesMap.values());

    res.status(200).json({
      success: true,
      count: allCourses.length,
      data: allCourses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicStudents,
  toggleStudentFeatured,
  getEnrolledCourses,
};
