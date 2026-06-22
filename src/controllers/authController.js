const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const ClassLink = require("../models/ClassLink");
const TeacherNotice = require("../models/TeacherNotice");

const registerUser = async (req, res) => {
  try {
    const { email, studentMobile, password, role } = req.body;

    const userExists = await User.findOne({
      $or: [{ email }, { phone: studentMobile }],
    });
    if (userExists) {
      return res.status(400).json({ message: "ব্যবহারকারী ইতিমধ্যে বিদ্যমান" });
    }

    const profileImage = req.file ? req.file.path : null;

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

    if (user.role === "student") {
      await StudentProfile.create({
        user: user._id,
        studentNameBn: req.body.studentNameBn,
        classLevel: req.body.classLevel,
        department: req.body.department,
        fatherName: req.body.fatherName,
        fatherMobile: req.body.fatherMobile,
        fatherJob: req.body.fatherJob,
        motherName: req.body.motherName,
        motherMobile: req.body.motherMobile,
        motherJob: req.body.motherJob,
      });
    }

    if (user.role === "teacher") {
      await TeacherProfile.create({
        user: user._id,
        teacherNameBn: req.body.teacherNameBn,
        department: req.body.department,
        designation: req.body.designation,
        qualifications: req.body.qualifications,
        biography: req.body.biography,
        experience: req.body.experience,
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

const loginUser = async (req, res) => {
  try {
    const { email: identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Please provide both an email/phone and a password" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (user && (await user.matchPassword(password))) {
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
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        profile: profileData || null,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email/phone or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🎯 রি-ফ্যাক্টরিং: প্রোফাইল আপডেট এপিআই (পাসওয়ার্ড ওভাররাইট ব্লকিং টেকনিকসহ)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileData, ...userUpdates } = req.body;

    // 🔒 সিকিউরিটি লক: এই এপিআই দিয়ে কোনোভাবেই পাসওয়ার্ড বা রোল ম্যানিপুলেট করা যাবে না
    delete userUpdates.password;
    delete userUpdates.role;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি" });

    if (req.file) {
      userUpdates.profileImage = req.file.path;
    }

    // মেইন ইউজার অবজেক্ট আপডেট
    Object.keys(userUpdates).forEach((key) => {
      user[key] = userUpdates[key];
    });
    await user.save();

    let parsedProfileData =
      typeof profileData === "string" ? JSON.parse(profileData) : profileData;
    let updatedProfile = null;

    if (user.role === "student" && parsedProfileData) {
      updatedProfile = await StudentProfile.findOneAndUpdate(
        { user: userId },
        { $set: parsedProfileData },
        { new: true, runValidators: true },
      ).populate("department", "name");
    } else if (user.role === "teacher" && parsedProfileData) {
      updatedProfile = await TeacherProfile.findOneAndUpdate(
        { user: userId },
        { $set: parsedProfileData },
        { new: true, runValidators: true },
      ).populate("department", "name");
    } else {
      // যদি আলাদা প্রোফাইল ডাটা পাস না করা হয়, ডাটাবেজ থেকে এক্সিস্টিং ডাটা রিড করা হবে
      updatedProfile =
        user.role === "teacher"
          ? await TeacherProfile.findOne({ user: userId }).populate(
              "department",
              "name",
            )
          : await StudentProfile.findOne({ user: userId }).populate(
              "department",
              "name",
            );
    }

    res.status(200).json({
      message: "প্রোফাইল সফলভাবে আপডেট হয়েছে",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        profileImage: user.profileImage,
        birthDate: user.birthDate,
        division: user.division,
        presentDivision: user.presentDivision,
        district: user.district,
        permanentAddress: user.permanentAddress,
        role: user.role,
        profile: updatedProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🎯 নতুন সিকিউর এপিআই: চেঞ্জ পাসওয়ার্ড (Change Password with Verification)
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "বর্তমান এবং নতুন পাসওয়ার্ড উভয়ই প্রদান করুন" });
    }

    // ডাটাবেজ থেকে ম্যাচপাসওয়ার্ড মেথড ব্যবহারের সুবিধার্থে ইউজার অবজেক্ট রিড
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "ব্যবহারকারী পাওয়া যায়নি" });

    // ১. ওল্ড পাসওয়ার্ড ভ্যালিডেশন চেক
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়" });
    }

    // ২. নতুন পাসওয়ার্ড সেট করা (User Model pre-save হুক এটিকে অটোমেটিক সল্ট হ্যাশ করে দেবে)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password").lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    let profileData = null;
    let extraData = {};

    if (user.role === "teacher") {
      profileData = await TeacherProfile.findOne({ user: userId })
        .populate("department", "name")
        .lean();
    } else if (user.role === "student") {
      const [studentProfile, noticesFeed, classLinksFeed] = await Promise.all([
        StudentProfile.findOne({ user: userId })
          .populate("department", "name")
          .lean(),

        TeacherNotice.find({})
          .populate("course", "name category banner")
          .populate("instructor", "name profilePicture")
          .sort({ pinned: -1, createdAt: -1 })
          .lean(),

        ClassLink.find({})
          .populate("course", "title category image")
          .populate("instructor", "name profilePicture")
          .sort({ classDate: 1, startTime: 1 })
          .lean(),
      ]);

      profileData = studentProfile;
      extraData = {
        notices: noticesFeed,
        classLinks: classLinksFeed,
      };
    }

    res.status(200).json({
      ...user,
      profile: profileData || null,
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

      await StudentProfile.create({
        user: user._id,
        studentNameBn: "",
      });
    }

    let profileData = null;
    if (user.role === "student") {
      profileData = await StudentProfile.findOne({ user: user._id }).populate(
        "department",
        "name",
      );
    } else if (user.role === "teacher") {
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
  changePassword,
};
