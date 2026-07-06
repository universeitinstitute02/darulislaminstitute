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
    const { search, department, limit } = req.query;
    const limitCount = limit ? parseInt(limit) : 0;

    // Base filter to only show officially approved profiles
    let queryConditions = { isApproved: true };

    // If a department filter is requested from client architecture
    if (department && department.trim() !== "") {
      queryConditions.department = department;
    }

    // First search the User collections if name query exists to extract valid references
    if (search && search.trim() !== "") {
      const User = require("../models/User");
      const matchedUsers = await User.find({
        name: { $regex: search.trim(), $options: "i" },
      }).select("_id");

      const userIds = matchedUsers.map((u) => u._id);
      queryConditions.user = { $in: userIds };
    }

    const teachers = await TeacherProfile.find(queryConditions)
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

    // Parallal Promise Architechture
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

    const courseIds = ownCourses.map((c) => c._id);

    // 2. Todays Class Counts
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

    // Unique Student Filtering
    const uniqueStudentIds = new Set(
      enrollments.map((e) => e.student?.toString()).filter(Boolean),
    );

    // Final Response
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
          teacherId: profile?.teacherId || "",
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
