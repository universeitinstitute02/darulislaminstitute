const User = require("../models/User");
const TeacherProfile = require("../models/TeacherProfile");
const StudentProfile = require("../models/StudentProfile");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// Get All Users with Search & Filter
const getAllUsers = async (req, res) => {
  try {
    const { role, search, status, department, experience } = req.query;
    let query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 1. Fetch core users matching primary user credentials
    let users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const userIds = users.map((user) => user._id);

    // 2. Handle filtering when role is teacher
    if (role === "teacher") {
      let profileFilter = { user: { $in: userIds } };

      // Apply status parameter filter securely
      if (status === "pending") {
        profileFilter.isApproved = false;
      } else if (status === "approved") {
        profileFilter.isApproved = true;
      }

      // Apply department ObjectID match
      if (department) {
        profileFilter.department = department;
      }

      // Apply regex filtering for localized experience formats
      if (experience) {
        profileFilter.experience = { $regex: experience, $options: "i" };
      }

      const profiles = await TeacherProfile.find(profileFilter).populate(
        "department",
        "name",
      );

      // Merge results and discard users whose profiles didn't match the criteria
      users = users
        .map((user) => {
          const profile = profiles.find(
            (p) => p.user.toString() === user._id.toString(),
          );
          return profile ? { ...user._doc, profileData: profile } : null;
        })
        .filter((user) => user !== null);
    } else if (role === "student") {
      // Handle fallback filtering mapping for student arrays if necessary
      const profiles = await StudentProfile.find({ user: { $in: userIds } });

      users = users.map((user) => {
        const profile = profiles.find(
          (p) => p.user.toString() === user._id.toString(),
        );
        return { ...user._doc, profileData: profile || null };
      });
    }

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single User Details By ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profileData = null;

    if (user.role === "teacher") {
      profileData = await TeacherProfile.findOne({ user: user._id }).populate(
        "department",
        "name",
      );
    } else if (user.role === "student") {
      profileData = await StudentProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      data: {
        ...user._doc,
        profileData,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User and Extended Profile Data (Admin)
const adminUpdateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;
    let { profileData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Update core credentials data
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    if (req.file) {
      user.profileImage = req.file.path;
    }
    await user.save();

    // 2. Parse stringified nested profile payload from FormData execution
    if (profileData && typeof profileData === "string") {
      try {
        profileData = JSON.parse(profileData);
      } catch (parseError) {
        return res
          .status(400)
          .json({ message: "Invalid profileData JSON structure" });
      }
    }

    // 3. Update correlated profile layouts cleanly based on active roles
    if (user.role === "teacher" && profileData) {
      await TeacherProfile.findOneAndUpdate(
        { user: userId },
        { $set: profileData },
        { new: true, runValidators: true, upsert: true },
      );
    } else if (user.role === "student" && profileData) {
      await StudentProfile.findOneAndUpdate(
        { user: userId },
        { $set: profileData },
        { new: true, runValidators: true, upsert: true },
      );
    }

    res.status(200).json({
      success: true,
      message: "User and profile datasets updated successfully",
      image: user.image,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete User and clear related profiles safely
const adminDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove associated child structures to prevent dead data references
    if (user.role === "teacher") {
      await TeacherProfile.deleteOne({ user: userId });
    } else if (user.role === "student") {
      await StudentProfile.deleteOne({ user: userId });
    }

    // Remove primary authentication key document
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User and corresponding profile data permanently removed",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveTeacher = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const userId = req.params.id;

    const profile = await TeacherProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    profile.isApproved = isApproved;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Teacher ${isApproved ? "approved" : "disapproved"} successfully`,
      isApproved: profile.isApproved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    const validRoles = ["student", "teacher", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    if (role === "teacher") {
      const existingProfile = await TeacherProfile.findOne({ user: userId });
      if (!existingProfile) {
        await TeacherProfile.create({
          user: userId,
          designation: "New Teacher",
          isApproved: false,
        });
      }
    } else if (role === "student") {
      const existingProfile = await StudentProfile.findOne({ user: userId });
      if (!existingProfile) {
        await StudentProfile.create({ user: userId });
      }
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      user: { id: user._id, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// Teacher - My Students Controller (Advanced Server-Side Filtering)
// ==========================================
const getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { courseId, courseCategoryType, search } = req.query; // 🎯 সার্ভার সাইড কুয়েরি ডিক্লেয়ারেশন

    // ১. প্রথমে এই শিক্ষকের অধীনে থাকা সমস্ত কোর্স খুঁজে বের করা হলো
    const teacherCourses = await Course.find({ instructor: teacherId }).select(
      "_id",
    );
    const allCourseIds = teacherCourses.map((course) => course._id);

    // ২. মেইন কুয়েরি অবজেক্ট আর্কিটেকচার
    let queryConditions = {
      course: { $in: allCourseIds },
      status: "approved",
    };

    // নির্দিষ্ট কোর্স ফিল্টার (যদি শিক্ষক ড্রপডাউন থেকে সিলেক্ট করেন)
    if (courseId) {
      queryConditions.course = courseId;
    }

    // ৩. শিক্ষার্থী পপুলেশন ও মেলাবার জন্য মঙ্গুজ এগ্রিগেশন পাইপলাইন অথবা ডাইনামিক পপুলেশন ম্যাচ মেকানিজম
    let populateStudentOptions = {
      path: "student",
      select: "name email phone profileImage gender",
    };
    let populateCourseOptions = {
      path: "course",
      select: "title courseCategoryType image price",
    };

    // যদি কোর্স টাইপ (academic/general) ফিল্টার থাকে
    if (courseCategoryType) {
      populateCourseOptions.match = { courseCategoryType };
    }

    // ৪. ডাটাবেজ কোয়েরি ট্রিগার
    const enrollments = await Enrollment.find(queryConditions)
      .populate(populateStudentOptions)
      .populate(populateCourseOptions)
      .sort({ createdAt: -1 })
      .lean();

    // ৫. সার্ভার-সাইড অ্যাডভান্সড ফিল্টারিং ও গ্লোবাল সার্চ সিঙ্ক
    let structuredStudents = enrollments
      .map((enroll) => {
        // যদি কোর্স ফিল্টারের সাথে টাইপ না মেলে বা স্টুডেন্ট না থাকে, তবে স্কিপ করবে
        if (!enroll.student || !enroll.course) return null;

        return {
          _id: enroll.student._id,
          name: enroll.student.name,
          email: enroll.student.email,
          phone: enroll.student.phone,
          profileImage: enroll.student.profileImage,
          gender: enroll.student.gender,
          role: "student",
          enrolledCourse: {
            _id: enroll.course._id,
            title: enroll.course.title,
            image: enroll.course.image,
            courseCategoryType: enroll.course.courseCategoryType,
          },
          enrolledAt: enroll.createdAt,
        };
      })
      .filter(Boolean);

    // 🔍 গ্লোবাল সার্চ কুয়েরি ম্যাচিং (নাম, ইমেইল, ফোন নম্বর)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      structuredStudents = structuredStudents.filter(
        (student) =>
          searchRegex.test(student.name) ||
          searchRegex.test(student.email) ||
          searchRegex.test(student.phone),
      );
    }

    res.status(200).json({
      success: true,
      count: structuredStudents.length,
      data: structuredStudents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  adminUpdateUser,
  adminDeleteUser,
  updateUserRole,
  approveTeacher,
  getTeacherStudents,
};
