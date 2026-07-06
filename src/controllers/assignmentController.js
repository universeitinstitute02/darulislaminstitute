const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");

const createAssignment = async (req, res) => {
  try {
    const { title, description, course, totalMarks, dueDate } = req.body;

    if (!title || !course || !totalMarks || !dueDate) {
      return res
        .status(400)
        .json({ message: "সবগুলো ফিল্ড পূরণ করা বাধ্যতামূলক" });
    }

    const newAssignment = await Assignment.create({
      title,
      description: description || "",
      course,
      totalMarks,
      dueDate,
      instructor: req.user._id,
    });

    res.status(201).json(newAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInstructorSubmissions = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { status } = req.query;

    const queryFilter = {};
    if (status) queryFilter.status = status;

    const submissions = await AssignmentSubmission.find(queryFilter)
      .populate({
        path: "assignment",
        match: { instructor: instructorId },
        select: "title description totalMarks",
      })
      .populate("student", "name profilePicture")
      .populate("course", "title category")
      .sort({ createdAt: -1 });

    const filteredSubmissions = submissions.filter(
      (submission) => submission.assignment !== null,
    );
    res.status(200).json(filteredSubmissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const evaluateSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { marksObtained, instructorFeedback } = req.body;

    if (marksObtained === undefined || marksObtained === null) {
      return res.status(400).json({ message: "Marks allocation is required" });
    }

    const submission =
      await AssignmentSubmission.findById(submissionId).populate("assignment");
    if (!submission)
      return res.status(404).json({ message: "Submission records not found" });

    if (
      submission.assignment.instructor.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized operation on this asset" });
    }

    if (marksObtained > submission.assignment.totalMarks) {
      return res.status(400).json({
        message: `প্রাপ্ত নম্বর মোট নম্বর (${submission.assignment.totalMarks}) এর বেশি হতে পারে না`,
      });
    }

    submission.marksObtained = marksObtained;
    submission.instructorFeedback = instructorFeedback || "";
    submission.status = "reviewed";

    await submission.save();
    res
      .status(200)
      .json({ message: "Submission evaluated successfully", data: submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getEvaluationStats = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const assignments = await Assignment.find({
      instructor: instructorId,
    }).select("_id");
    const assignmentIds = assignments.map((asm) => asm._id);

    const pendingCount = await AssignmentSubmission.countDocuments({
      assignment: { $in: assignmentIds },
      status: "pending",
    });

    res.status(200).json({ pendingAssignmentsCount: pendingCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentAssignments = async (req, res) => {
  try {
    const { course } = req.query;
    const queryFilter = {};

    if (course) {
      queryFilter.course = course;
    }

    const assignments = await Assignment.find(queryFilter)
      .populate("course", "title category")
      .populate("instructor", "name profilePicture")
      .sort({ dueDate: 1 });

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitAssignment = async (req, res) => {
  try {
    const { assignmentId, courseId, studentNotes } = req.body;

    if (!assignmentId || !courseId) {
      return res
        .status(400)
        .json({ message: "Assignment ID and Course ID are required" });
    }

    const alreadySubmitted = await AssignmentSubmission.findOne({
      assignment: assignmentId,
      student: req.user._id,
    });

    if (alreadySubmitted) {
      return res
        .status(400)
        .json({ message: "আপনি ইতিমধ্যে এই অ্যাসাইনমেন্টটি জমা দিয়েছেন" });
    }

    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map((file) => file.path);
    } else if (req.body.submittedImages) {
      imagePaths =
        typeof req.body.submittedImages === "string"
          ? JSON.parse(req.body.submittedImages)
          : req.body.submittedImages;
    }

    const newSubmission = await AssignmentSubmission.create({
      assignment: assignmentId,
      course: courseId,
      student: req.user._id,
      studentNotes: studentNotes || "",
      submittedImages: imagePaths,
    });

    res.status(201).json({
      message: "আপনার অ্যাসাইনমেন্টটি সফলভাবে জমা হয়েছে",
      data: newSubmission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStudentResults = async (req, res) => {
  try {
    const results = await AssignmentSubmission.find({ student: req.user._id })
      .populate("assignment", "title description totalMarks dueDate")
      .populate("course", "title")
      .sort({ updatedAt: -1 });

    res.status(200).json({ totalSubmitted: results.length, data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTeacherCreatedAssignments = async (req, res) => {
  try {
    const instructorId = req.user._id;

    const assignments = await Assignment.find({ instructor: instructorId })
      .populate("course", "title name category")
      .sort({ createdAt: -1 });

    res.status(200).json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Update a specific assignment asset
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, totalMarks, dueDate } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res
        .status(404)
        .json({ message: "অ্যাসাইনমেন্টটি খুঁজে পাওয়া যায়নি" });
    }

    // Security check: Validate asset ownership
    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized operation on this asset" });
    }

    assignment.title = title || assignment.title;
    assignment.description =
      description !== undefined ? description : assignment.description;
    assignment.totalMarks = totalMarks || assignment.totalMarks;
    assignment.dueDate = dueDate || assignment.dueDate;

    await assignment.save();
    res
      .status(200)
      .json({ message: "Assignment updated successfully", data: assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. Delete a specific assignment asset completely
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res
        .status(404)
        .json({ message: "অ্যাসাইনমেন্টটি খুঁজে পাওয়া যায়নি" });
    }

    // Security check: Validate asset ownership
    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized operation on this asset" });
    }

    await assignment.deleteOne();
    res
      .status(200)
      .json({ message: "অ্যাসাইনমেন্টটি সফলভাবে মুছে ফেলা হয়েছে" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAssignment,
  getInstructorSubmissions,
  evaluateSubmission,
  getEvaluationStats,
  getStudentAssignments,
  submitAssignment,
  getStudentResults,
  getTeacherCreatedAssignments,
  updateAssignment,
  deleteAssignment,
};
