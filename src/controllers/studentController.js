const StudentProfile = require("../models/StudentProfile");

// Get All Approved/Public Students Catalog (Sanitized View)
const getPublicStudents = async (req, res) => {
  try {
    // 1. Fetch student profiles (Filtering out internal system data if any)
    const students = await StudentProfile.find({})
      // Security Check: Only populate name & profile picture from User model.
      // NEVER populate sensitive contact data like email, phone etc.
      .populate("user", "name profilePicture")
      // Populate department/technology details if referenced
      .populate("department", "name")
      .sort({ createdAt: -1 }); // Showing newest students first

    // 2. Strict Data Sanitization mapping (Explicitly passing safe public properties only)
    const sanitizedStudents = students.map((student) => ({
      _id: student._id,
      user: student.user, // Contains safe 'name' and 'profilePicture'
      department: student.department,
      rollNumber: student.rollNumber || "", // Roll or Student ID if public-facing
      batch: student.batch || "", // Session/Batch (e.g., "2024-25")
      skills: student.skills || [], // Technical skills or fields of interest
      bio: student.bio || "",
    }));

    res.status(200).json({
      totalCount: sanitizedStudents.length,
      data: sanitizedStudents,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicStudents,
};
