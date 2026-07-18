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

    let users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const userIds = users.map((user) => user._id);

    if (role === "teacher") {
      let profileFilter = { user: { $in: userIds } };

      if (status === "pending") {
        profileFilter.isApproved = false;
      } else if (status === "approved") {
        profileFilter.isApproved = true;
      }

      if (department) profileFilter.department = department;

      if (search) {
        profileFilter.$or = [{ teacherId: { $regex: search, $options: "i" } }];
      }

      if (experience) {
        profileFilter.experience = { $regex: experience, $options: "i" };
      }

      const profiles = await TeacherProfile.find(profileFilter).populate(
        "department",
        "name",
      );

      users = users
        .map((user) => {
          const profile = profiles.find(
            (p) => p.user.toString() === user._id.toString(),
          );
          return profile ? { ...user._doc, profileData: profile } : null;
        })
        .filter((user) => user !== null);
    } else if (role === "student") {
      let studentProfileFilter = { user: { $in: userIds } };

      if (status === "pending") {
        studentProfileFilter.isApproved = false;
      } else if (status === "approved") {
        studentProfileFilter.isApproved = true;
      }

      if (search) {
        studentProfileFilter.$or = [
          { studentId: { $regex: search, $options: "i" } },
        ];
      }

      const profiles = await StudentProfile.find(studentProfileFilter).populate(
        "department",
        "name",
      );

      users = users
        .map((user) => {
          const profile = profiles.find(
            (p) => p.user.toString() === user._id.toString(),
          );
          return profile ? { ...user._doc, profileData: profile } : null;
        })
        .filter((user) => user !== null);
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
      profileData = await StudentProfile.findOne({ user: user._id }).populate(
        "department",
        "name",
      );
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

    let bodyData = req.body;
    if (typeof req.body === "string") {
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        bodyData = {};
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allowedUserFields = [
      "name",
      "email",
      "phone",
      "role",
      "isActive",
      "gender",
      "permanentAddress",
    ];
    let userUpdateData = {};

    Object.keys(bodyData).forEach((key) => {
      if (allowedUserFields.includes(key) && bodyData[key] !== undefined) {
        userUpdateData[key] = bodyData[key];
      }
    });

    if (userUpdateData.email && userUpdateData.email !== user.email) {
      const existingEmail = await User.findOne({ email: userUpdateData.email });
      if (existingEmail) {
        return res
          .status(400)
          .json({ message: "Email is already in use by another user." });
      }
    }

    if (userUpdateData.phone && userUpdateData.phone !== user.phone) {
      const existingPhone = await User.findOne({ phone: userUpdateData.phone });
      if (existingPhone) {
        return res
          .status(400)
          .json({ message: "Phone number is already in use by another user." });
      }
    }

    if (req.file) {
      userUpdateData.profileImage = req.file.path || req.file.location;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await User.findByIdAndUpdate(
        userId,
        { $set: userUpdateData },
        { returnDocument: "after", runValidators: true },
      );
    }

    let profileData = bodyData.profileData;
    if (profileData && typeof profileData === "string") {
      try {
        profileData = JSON.parse(profileData);
      } catch (parseError) {
        return res
          .status(400)
          .json({ message: "Invalid profileData JSON structure" });
      }
    }

    if (profileData) {
      if (
        profileData.department === "null" ||
        profileData.department === "" ||
        !profileData.department
      ) {
        delete profileData.department;
      }

      const allowedProfileFields = [
        "teacherNameBn",
        "designation",
        "experience",
        "qualifications",
        "department",
        "studentNameBn",
        "classLevel",
        "fatherName",
        "fatherMobile",
        "motherName",
        "motherMobile",
        "isFeatured",
      ];
      let filteredProfileData = {};

      Object.keys(profileData).forEach((key) => {
        if (
          allowedProfileFields.includes(key) &&
          profileData[key] !== undefined
        ) {
          filteredProfileData[key] = profileData[key];
        }
      });

      const targetRole = userUpdateData.role || user.role;

      if (Object.keys(filteredProfileData).length > 0) {
        if (targetRole === "teacher") {
          await TeacherProfile.findOneAndUpdate(
            { user: userId },
            { $set: filteredProfileData },
            { returnDocument: "after", runValidators: true, upsert: true },
          );
        } else if (targetRole === "student") {
          await StudentProfile.findOneAndUpdate(
            { user: userId },
            { $set: filteredProfileData },
            { returnDocument: "after", runValidators: true, upsert: true },
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "User and profile datasets updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete User
const adminDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "teacher") {
      await TeacherProfile.deleteOne({ user: userId });
    } else if (user.role === "student") {
      await StudentProfile.deleteOne({ user: userId });
    }

    await user.deleteOne();
    res.status(200).json({
      success: true,
      message: "User and corresponding profile data permanently removed",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Teachers Approval & Unique ID Generation
const approveTeacher = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const userId = req.params.id;

    const profile = await TeacherProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    if (isApproved && !profile.teacherId) {
      const currentYear = new Date().getFullYear();
      const totalTeachersWithId = await TeacherProfile.countDocuments({
        teacherId: { $ne: null },
      });

      const nextSequence = String(totalTeachersWithId + 1).padStart(3, "0");
      profile.teacherId = `DIT-${currentYear}-${nextSequence}`;
    }

    profile.isApproved = isApproved;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Teacher ${isApproved ? "approved with Custom ID" : "disapproved"} successfully`,
      isApproved: profile.isApproved,
      teacherId: profile.teacherId || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Students Approval & Student Unique ID Generation
const approveStudent = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const userId = req.params.id;

    const profile = await StudentProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // If Admin approved but no ID generated
    if (isApproved && !profile.studentId) {
      const currentYear = new Date().getFullYear();
      const totalStudentsWithId = await StudentProfile.countDocuments({
        studentId: { $ne: null },
      });

      // DIS-2026-0001
      const nextSequence = String(totalStudentsWithId + 1).padStart(4, "0");
      profile.studentId = `DIS-${currentYear}-${nextSequence}`;
    }

    profile.isApproved = isApproved;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Student ${isApproved ? "approved with Custom ID" : "disapproved"} successfully`,
      isApproved: profile.isApproved,
      studentId: profile.studentId || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Role Update Route Trigger Engine (No direct ID creation anymore)
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
        await StudentProfile.create({
          user: userId,
          isApproved: false, // default: pending
        });
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

// Teacher - My Students Controller
const getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { courseId, courseCategoryType, search } = req.query;

    const teacherCourses = await Course.find({ instructor: teacherId }).select(
      "_id",
    );
    const allCourseIds = teacherCourses.map((course) => course._id);

    let queryConditions = {
      course: { $in: allCourseIds },
      status: "approved",
    };

    if (courseId) {
      queryConditions.course = courseId;
    }

    let populateStudentOptions = {
      path: "student",
      select: "name email phone profileImage gender",
    };
    let populateCourseOptions = {
      path: "course",
      select: "title courseCategoryType image price",
    };

    if (courseCategoryType) {
      populateCourseOptions.match = { courseCategoryType };
    }

    const enrollments = await Enrollment.find(queryConditions)
      .populate(populateStudentOptions)
      .populate(populateCourseOptions)
      .sort({ createdAt: -1 })
      .lean();

    const studentUserIds = enrollments
      .map((e) => e.student?._id)
      .filter(Boolean);
    const studentProfiles = await StudentProfile.find({
      user: { $in: studentUserIds },
    })
      .select("user studentId")
      .lean();

    let structuredStudents = enrollments
      .map((enroll) => {
        if (!enroll.student || !enroll.course) return null;

        const matchedProfile = studentProfiles.find(
          (p) => p.user.toString() === enroll.student._id.toString(),
        );

        return {
          _id: enroll.student._id,
          name: enroll.student.name,
          email: enroll.student.email,
          phone: enroll.student.phone,
          profileImage: enroll.student.profileImage,
          gender: enroll.student.gender,
          studentId: matchedProfile ? matchedProfile.studentId : null,
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

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      structuredStudents = structuredStudents.filter(
        (student) =>
          searchRegex.test(student.name) ||
          searchRegex.test(student.email) ||
          searchRegex.test(student.phone) ||
          (student.studentId && searchRegex.test(student.studentId)),
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
  approveStudent,
  getTeacherStudents,
};
