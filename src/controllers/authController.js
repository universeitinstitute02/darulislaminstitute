const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const ClassLink = require("../models/ClassLink");
const TeacherNotice = require("../models/TeacherNotice");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

const registerUser = async (req, res) => {
  try {
    const { email, studentMobile, password, role } = req.body;

    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanPhone = studentMobile ? studentMobile.trim() : "";

    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });
    if (userExists) {
      return res.status(400).json({
        message:
          "এই ইমেইল বা মোবাইল নম্বর দিয়ে অলরেডি অ্যাকাউন্ট তৈরি করা আছে।",
      });
    }

    const profileImage = req.file ? req.file.path : null;

    let finalGender = req.body.gender;
    if (finalGender && typeof finalGender === "string") {
      finalGender = finalGender.trim().toLowerCase();
    }

    // Generate Verification Token (Valid for 24 Hours)
    const vToken = crypto.randomBytes(32).toString("hex");
    const vTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    const user = await User.create({
      name: req.body.studentNameEn ? req.body.studentNameEn.trim() : "Unknown",
      phone: cleanPhone,
      email: cleanEmail,
      password,
      role: role || "student",
      profileImage,
      birthDate: req.body.birthDate,
      gender: finalGender,
      division: req.body.division,
      presentDivision: req.body.presentDivision,
      district: req.body.district,
      permanentAddress: req.body.permanentAddress,
      verificationToken: vToken,
      verificationTokenExpires: vTokenExpires,
      isVerified: false,
    });

    if (user.role === "student") {
      const currentYear = new Date().getFullYear();
      const lastStudent = await StudentProfile.findOne({
        studentId: { $regex: `^DIS-${currentYear}-` },
      })
        .sort({ studentId: -1 })
        .select("studentId");

      let nextSequenceNumber = 1;
      if (lastStudent && lastStudent.studentId) {
        const lastSequenceStr = lastStudent.studentId.split("-")[2];
        nextSequenceNumber = parseInt(lastSequenceStr, 10) + 1;
      }

      const nextSequence = String(nextSequenceNumber).padStart(4, "0");
      const generatedStudentId = `DIS-${currentYear}-${nextSequence}`;

      await StudentProfile.create({
        user: user._id,
        studentId: generatedStudentId,
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

    // Send Verification Email
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${vToken}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; rounded: 10px;">
        <h2 style="color: #0B5D3B; text-align: center;">দারুল ইসলাম ইনস্টিটিউট</h2>
        <p>আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ,</p>
        <p>আপনার অ্যাকাউন্টটি সক্রিয় করতে নিচের লিঙ্কে ক্লিক করে ইমেইল ভেরিফিকেশন সম্পন্ন করুন:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #0B5D3B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ইমেইল ভেরিফাই করুন</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">এই লিঙ্কটি আগামী ২৪ ঘণ্টার জন্য কার্যকর থাকবে।</p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "অ্যাকাউন্ট ভেরিফিকেশন লিঙ্ক - দারুল ইসলাম ইনস্টিটিউট",
        htmlContent,
      });
    } catch (emailErr) {
      console.error("Email processing error:", emailErr);
    }

    res.status(201).json({
      success: true,
      message:
        "রেজিস্ট্রেশন সফল হয়েছে। আপনার ইমেইলে একটি ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে।",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "টোকেন প্রদান করা হয়নি।" });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "ভেরিফিকেশন টোকেনটি অবৈধ অথবা মেয়াদোত্তীর্ণ হয়ে গেছে।",
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true },
        $unset: { verificationToken: "", verificationTokenExpires: "" },
      },
    );

    return res.status(200).json({
      success: true,
      message: "আপনার ইমেইল সফলভাবে ভেরিফাই করা হয়েছে। এখন লগইন করতে পারেন।",
    });
  } catch (error) {
    console.error("Verify Email Backend Error ->", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res
        .status(404)
        .json({ message: "এই ইমেইলে কোনো ইউজার খুঁজে পাওয়া যায়নি।" });
    }
    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "এই অ্যাকাউন্টটি ইতিমধ্যে ভেরিফাইড।" });
    }

    const vToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = vToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${vToken}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0B5D3B; text-align: center;">দারুল ইসলাম ইনস্টিটিউট</h2>
        <p>আপনার অ্যাকাউন্টটি সক্রিয় করতে নিচের লিঙ্কে ক্লিক করে ইমেইল ভেরিফিকেশন সম্পন্ন করুন:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #0B5D3B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">ইমেইল ভেরিফাই করুন</a>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "নতুন ভেরিফিকেশন লিঙ্ক",
      htmlContent,
    });
    res.status(200).json({
      success: true,
      message: "নতুন ভেরিফিকেশন লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email: identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "অনুগ্রহ করে ইমেইল/মোবাইল এবং পাসওয়ার্ড উভয়ই প্রদান করুন।",
      });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (user && (await user.matchPassword(password))) {
      // Defensive Restriction Check
      if (!user.isVerified) {
        return res.status(403).json({
          needsVerification: true,
          message:
            "আপনার অ্যাকাউন্টটি ভেরিফাইড নয়। দয়া করে লগইন করার আগে ইমেইল লিঙ্ক চেক করুন।",
        });
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
      res.status(401).json({
        message: "ভুল ইমেইল/মোবাইল নম্বর অথবা পাসওয়ার্ড দেওয়া হয়েছে।",
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "ইমেইল প্রদান করা আবশ্যক।" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "এই ইমেইল এড্রেস দিয়ে কোনো অ্যাকাউন্ট রেজিস্টার করা নেই।",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetPasswordExpires,
        },
      },
    );

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0;">
        <h2 style="color: #0B5D3B; text-align: center;">পাসওয়ার্ড রিসেট রিকোয়েস্ট</h2>
        <p>নিচের বাটনে ক্লিক করে আপনার নতুন পাসওয়ার্ড সেট করে নিন:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">পাসওয়ার্ড পরিবর্তন করুন</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">এই লিঙ্কটি আগামী ১৫ মিনিটের জন্য কার্যকর থাকবে। আপনি যদি এই রিকোয়েস্ট না করে থাকেন, তবে ইমেইলটি ইগনোর করুন।</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: "পাসওয়ার্ড রিসেট লিঙ্ক - দারুল ইসলাম ইনস্টিটিউট",
      htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: "পাসওয়ার্ড রিসেট করার লিঙ্কটি আপনার ইমেইলে পাঠানো হয়েছে।",
    });
  } catch (error) {
    console.error("Forgot Password Backend Error ->", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // 1. Data Input Validation Check
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "টোকেন এবং নতুন পাসওয়ার্ড প্রদান করা আবশ্যক।",
      });
    }

    // Find User according to Token and Validations
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "পাসওয়ার্ড রিসেট টোকেনটি অবৈধ অথবা এটির মেয়াদ শেষ হয়ে গেছে।",
      });
    }

    // Hash New Password
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Reset and Place new Hashed Password to DB & Clean all tokens
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      },
    );

    return res.status(200).json({
      success: true,
      message:
        "আপনার পাসওয়ার্ডটি সফলভাবে পরিবর্তন করা হয়েছে।",
    });
  } catch (error) {
    console.error("Reset Password Backend Error ->", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { profileData, ...userUpdates } = req.body;

    delete userUpdates.password;
    delete userUpdates.role;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });

    if (req.file) {
      userUpdates.profileImage = req.file.path;
    }

    Object.keys(userUpdates).forEach((key) => {
      user[key] = userUpdates[key];
    });
    await user.save();

    let parsedProfileData =
      typeof profileData === "string" ? JSON.parse(profileData) : profileData;
    let updatedProfile = null;

    if (parsedProfileData) {
      delete parsedProfileData.studentId;
      delete parsedProfileData.teacherId;
    }

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
      message: "প্রোফাইল সফলভাবে আপডেট করা হয়েছে",
      user: {
        ...user._doc,
        password: undefined,
        profile: updatedProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "বর্তমান এবং নতুন উভয় পাসওয়ার্ডই প্রদান করুন।" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch)
      return res
        .status(401)
        .json({ message: "আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়।" });

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password").lean();
    if (!user)
      return res.status(404).json({ message: "ইউজার খুঁজে পাওয়া যায়নি।" });

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
      extraData = { notices: noticesFeed, classLinks: classLinksFeed };
    }

    res
      .status(200)
      .json({ ...user, profile: profileData || null, ...extraData });
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
        isVerified: true, // Google login auto-verified
      });

      const currentYear = new Date().getFullYear();
      const totalStudentsWithId = await StudentProfile.countDocuments({
        studentId: { $ne: null },
      });
      const nextSequence = String(totalStudentsWithId + 1).padStart(4, "0");

      await StudentProfile.create({
        user: user._id,
        studentId: `DIS-${currentYear}-${nextSequence}`,
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
  verifyEmail,
  resendVerification,
  loginUser,
  forgotPassword,
  resetPassword,
  getMe,
  googleLogin,
  updateProfile,
  changePassword,
};
