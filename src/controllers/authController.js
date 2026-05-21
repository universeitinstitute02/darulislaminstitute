const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const Notice = require("../models/Notice");
const ClassLink = require("../models/ClassLink");
const TeacherNotice = require("../models/TeacherNotice");

const registerUser = async (req, res) => {
  try {
    const { email, studentMobile, password, role, ...rest } = req.body;

    const userExists = await User.findOne({
      $or: [{ email }, { phone: studentMobile }],
    });
    if (userExists)
      return res.status(400).json({ message: "ব্যবহারকারী ইতিমধ্যে বিদ্যমান" });

    const profileImage = req.file ? req.file.path : null;

    // 1. mian user common data
    const user = await User.create({
      name: req.body.studentNameEn,
      phone: studentMobile,
      email,
      password,
      role: role || "student",
      profileImage,
      birthDate: req.body.birthDate,
      gender: req.body.gender,
      division: req.body.division,
      presentDivision: req.body.presentDivision,
      district: req.body.district,
      permanentAddress: req.body.permanentAddress,
    });

    // make student profile if registering as student
    if (user.role === "student") {
      await StudentProfile.create({
        user: user._id,
        studentNameBn: req.body.studentNameBn,
        classLevel: req.body.classLevel,
        fatherName: req.body.fatherName,
        fatherMobile: req.body.fatherMobile,
        fatherJob: req.body.fatherJob,
        motherName: req.body.motherName,
        motherMobile: req.body.motherMobile,
        motherJob: req.body.motherJob,
      });
    }

    // 3. If Teacher, then make teacher profile
    if (user.role === "teacher") {
      await TeacherProfile.create({
        user: user._id,
        teacherNameBn: req.body.teacherNameBn,
        department: req.body.department,
        designation: req.body.designation,
        experience: req.body.experience,
        qualifications: req.body.qualifications,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Authenticate user & get token (Login)
const loginUser = async (req, res) => {
  try {
    const { email: identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Please provide both an email/phone and a password" });
    }

    // 1. Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    // 2. check password
    if (user && (await user.matchPassword(password))) {
      let profileData = null;

      // fetch right profile according to role
      if (user.role === "teacher") {
        profileData = await TeacherProfile.findOne({
          user: user._id,
        }).populate("department", "name");
      } else if (user.role === "student") {
        profileData = await StudentProfile.findOne({
          user: user._id,
        });
      }

      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        profile: profileData || null, // profile of teacher or student
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email/phone or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password, role, profileData, ...userUpdates } = req.body;

    // Main user data
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });

    if (req.file) {
      userUpdates.profileImage = req.file.path;
    }

    // Dynamic field update
    Object.keys(userUpdates).forEach((key) => {
      user[key] = userUpdates[key];
    });

    await user.save();

    // Profile update based on user Role
    let parsedProfileData =
      typeof profileData === "string" ? JSON.parse(profileData) : profileData;
    let updatedProfile = null;

    if (user.role === "student") {
      updatedProfile = await StudentProfile.findOneAndUpdate(
        { user: userId },
        { $set: parsedProfileData },
        { new: true, runValidators: true },
      );
    } else if (user.role === "teacher") {
      updatedProfile = await TeacherProfile.findOneAndUpdate(
        { user: userId },
        { $set: parsedProfileData },
        { new: true, runValidators: true },
      ).populate("department", "name");
    }

    res.status(200).json({
      message: "প্রোফাইল সফলভাবে আপডেট হয়েছে",
      user: {
        ...user._doc,
        password: "",
        profile: updatedProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get user profile
const getMe = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch primary user data instantly
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    let profileData = null;
    let extraData = {};

    // 2. Process architecture based on role
    if (user.role === "teacher") {
      profileData = await TeacherProfile.findOne({ user: userId }).populate(
        "department",
        "name",
      );
    } else if (user.role === "student") {
      const [studentProfile, noticesFeed, classLinksFeed] = await Promise.all([
        StudentProfile.findOne({ user: userId }),

        TeacherNotice.find({})
          .populate("course", "name category banner")
          .populate("instructor", "name profilePicture")
          .sort({ pinned: -1, createdAt: -1 }),

        ClassLink.find({})
          .populate("course", "title category image")
          .populate("instructor", "name profilePicture")
          .sort({ classDate: 1, startTime: 1 }),
      ]);

      profileData = studentProfile;
      extraData = {
        notices: noticesFeed,
        classLinks: classLinksFeed,
      };
    }

    // 3. Destructure and combine everything inside a single unified payload object
    res.status(200).json({
      ...user._doc,
      profile: profileData,
      ...extraData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { name, email } = req.body;

    let user = await User.findOne({ email });

    // 1. If user not exist then create new user and student profile
    if (!user) {
      const randomPassword =
        Math.random().toString(36).slice(-15) + process.env.JWT_SECRET;

      user = await User.create({
        name,
        email,
        phone: `G-${Date.now()}`,
        password: randomPassword,
        role: "student",
      });

      // make student profile for google user
      await StudentProfile.create({
        user: user._id,
        studentNameBn: "",
      });
    }

    // 2. Send response data after successful login/register
    let profileData = await StudentProfile.findOne({ user: user._id });
    if (!profileData && user.role === "teacher") {
      profileData = await TeacherProfile.findOne({ user: user._id }).populate(
        "department",
        "name",
      );
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: profileData || null,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  googleLogin,
  updateProfile,
};
