const TeacherProfile = require("../models/TeacherProfile");
const User = require("../models/User");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const ClassLink = require("../models/ClassLink");

const getPendingTeachers = async (req, res) => {
  try {
    const { search, status, department, experience } = req.query;
    let profileFilter = {};

    if (status === "pending") {
      profileFilter.isApproved = false;
    } else if (status === "approved") {
      profileFilter.isApproved = true;
    }

    if (department) {
      profileFilter.department = department;
    }

    if (experience) {
      profileFilter.experience = { $regex: experience, $options: "i" };
    }

    let matchedUserIds = [];
    if (search) {
      const users = await User.find({
        role: "teacher",
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      matchedUserIds = users.map((u) => u._id);
      profileFilter.user = { $in: matchedUserIds };
    }

    const teachers = await TeacherProfile.find(profileFilter)
      .populate("user", "name email phone profileImage")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalCount: teachers.length,
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleTeacherFeatured = async (req, res) => {
  try {
    const { isFeatured } = req.body;

    const profile = await TeacherProfile.findByIdAndUpdate(
      req.params.id,
      { isFeatured },
      { new: true, runValidators: true },
    );

    if (!profile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    res.status(200).json({
      success: true,
      message: "Teacher featured status updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveTeacher = async (req, res) => {
  try {
    const profile = await TeacherProfile.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true },
    );

    if (!profile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    await User.findByIdAndUpdate(
      profile.user,
      { role: "teacher" },
      { new: true },
    );

    res.status(200).json({
      message: "Teacher approved and role upgraded successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const profile = await TeacherProfile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    const userId = profile.user;
    await profile.deleteOne();
    await User.findByIdAndUpdate(userId, { role: "student" }, { new: true });

    res.status(200).json({
      message:
        "Teacher profile deleted and user successfully demoted to student",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicTeachers = async (req, res) => {
  try {
    const limitCount = req.query.limit ? parseInt(req.query.limit) : 0;

    const teachers = await TeacherProfile.find({
      isApproved: true,
      isFeatured: true,
    })
      .populate("user", "name email phone profileImage")
      .populate("department", "name")
      .sort({ createdAt: 1 })
      .limit(limitCount);

    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const teacherId = req.user._id;

    // ১. প্যারালাল প্রমিজ আর্কিটেকচার (ডাটাবেজ পারফরম্যান্স ফাস্ট রাখার ট্রিক)
    const [teacher, profile, ownCourses] = await Promise.all([
      User.findById(teacherId).select("-password").lean(),
      TeacherProfile.findOne({ user: teacherId })
        .populate("department", "name")
        .lean(),
      Course.find({ instructor: teacherId }).select("_id").lean(),
    ]);

    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "শিক্ষকের প্রোফাইল পাওয়া যায়নি" });
    }

    // 🎯 🎯 মেগা ফিক্স লক: ওল্ড টাইপো 'course._id' বদলে 'c._id' করা হলো
    const courseIds = ownCourses.map((c) => c._id);

    // ২. আজকের ক্লাসের সংখ্যা হিসাব (Date Range Matching)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [todayClassesCount, enrollments] = await Promise.all([
      ClassLink.countDocuments({
        instructor: teacherId,
        classDate: { $gte: startOfToday, $lte: endOfToday },
      }),
      Enrollment.find({
        course: { $in: courseIds },
        status: "approved",
      })
        .select("student")
        .lean(),
    ]);

    // ৩. ইউনিক শিক্ষার্থীর সংখ্যা ফিল্টারিং (একই ছাত্র একাধিক কোর্সে থাকতে পারে)
    const uniqueStudentIds = new Set(
      enrollments.map((e) => e.student?.toString()).filter(Boolean),
    );

    // ৪. চুড়ান্ত রেসপন্স অবজেক্ট
    res.status(200).json({
      success: true,
      data: {
        profile: {
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          profileImage: teacher.profileImage || null,
          createdAt: teacher.createdAt,
          teacherNameBn: profile?.teacherNameBn || "",
          designation: profile?.designation || "শিক্ষক",
          departmentName: profile?.department?.name || "দ্বীনি বিভাগ",
          isApproved: profile?.isApproved || false,
        },
        stats: {
          todayClasses: todayClassesCount,
          totalStudents: uniqueStudentIds.size,
          totalCourses: ownCourses.length,
          attendanceRate: "৯৫%",
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPendingTeachers,
  toggleTeacherFeatured,
  approveTeacher,
  getPublicTeachers,
  deleteTeacher,
  getDashboardStats,
};
