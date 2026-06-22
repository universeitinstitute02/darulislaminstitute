const Notice = require("../models/Notice");
const User = require("../models/User");
const Course = require("../models/Course");
const Order = require("../models/Order");
const Enrollment = require("../models/Enrollment");

const createAdminNotice = async (req, res) => {
  try {
    const { title, description, category, type, pinned } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Mandatory fields cannot be left empty" });
    }
    const newNotice = await Notice.create({
      title,
      description,
      category: category || "others",
      type,
      pinned,
      admin: req.user._id,
    });
    res.status(201).json({
      message: "Global institutional notice published successfully",
      data: newNotice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllAdminNotices = async (req, res) => {
  try {
    const notices = await Notice.find({}).sort({ pinned: -1, createdAt: -1 });
    res.status(200).json({ totalCount: notices.length, data: notices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdminNotice = async (req, res) => {
  try {
    const updatedNotice = await Notice.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!updatedNotice)
      return res.status(404).json({ message: "Notice entry not found" });
    res.status(200).json({
      message: "Global notice updated successfully",
      data: updatedNotice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAdminNotice = async (req, res) => {
  try {
    const deleted = await Notice.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Notice entry not found" });
    res.status(200).json({ message: "Global notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAdminDashboardOverview = async (req, res) => {
  try {
    let totalStudentsCount = 0;
    let activeCoursesCount = 0;
    let pendingEnrollmentsCount = 0;
    let allApprovedEnrollments = [];
    let allDeliveredOrders = [];
    let recentOrdersList = [];
    let allEnrollmentsForTopCourses = [];

    // 🎯 ক্যোয়েরি ১: ইউজার কাউন্ট
    try {
      totalStudentsCount = await User.countDocuments({ role: "student" });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, message: "User Count Error: " + e.message });
    }

    // 🎯 ক্যোয়েরি ২: একটিভ কোর্স কাউন্ট
    try {
      activeCoursesCount = await Course.countDocuments({ isPublished: true });
    } catch (e) {
      return res
        .status(500)
        .json({ success: false, message: "Course Count Error: " + e.message });
    }

    // 🎯 ক্যোয়েরি ৩: এনরোলমেন্ট ডাটা ফেচ (ক্র্যাশ এড়াতে লিনিয়ার পপআপ ও লীন মেথড)
    try {
      pendingEnrollmentsCount = await Enrollment.countDocuments({
        status: "pending",
      });

      allApprovedEnrollments = await Enrollment.find({ status: "approved" })
        .select("paymentDetails.amountPaid course createdAt")
        .populate({
          path: "course",
          select: "title category courseCategoryType instructor",
        })
        .lean();

      allEnrollmentsForTopCourses = await Enrollment.find({
        status: "approved",
      })
        .select("course paymentDetails.amountPaid")
        .lean();
    } catch (e) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Enrollment Pipeline Error: " + e.message,
        });
    }

    // 🎯 ক্যোয়েরি ৪: অর্ডার ট্রানজেকশন ট্র্যাকার
    try {
      allDeliveredOrders = await Order.find({ orderStatus: "delivered" })
        .select("totalAmount createdAt")
        .lean();
      recentOrdersList = await Order.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
    } catch (e) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Order Pipeline Error: " + e.message,
        });
    }

    // --- রেভিনিউ ক্যালকুলেশন মেকানিজম ---
    const enrollmentRevenue = allApprovedEnrollments.reduce((sum, item) => {
      return sum + (Number(item?.paymentDetails?.amountPaid) || 0);
    }, 0);

    const shopRevenue = allDeliveredOrders.reduce((sum, item) => {
      return sum + (Number(item?.totalAmount) || 0);
    }, 0);

    const totalGrossRevenue = enrollmentRevenue + shopRevenue;

    // 🎯 পাই চার্ট ক্যাটাগরি প্রসেসিং (real-time dynamic alignment tracking)
    const categoryMap = {};
    let totalAssignedCategoryItems = 0;

    allApprovedEnrollments.forEach((enroll) => {
      if (enroll?.course) {
        let catName = "জেনারেল (General)";

        // যদি কোর্সটি একাডেমিক ক্যাটাগরির হয়
        if (enroll.course.courseCategoryType === "academic") {
          catName = "একাডেমিক (Academic)";
        } else if (enroll.course.courseCategoryType === "general") {
          catName = "জেনারেল (General)";
        }

        categoryMap[catName] = (categoryMap[catName] || 0) + 1;
        totalAssignedCategoryItems++;
      }
    });

    const defaultCategoryColors = [
      "#1B4332",
      "#2D6A4F",
      "#D4A017",
      "#52796F",
      "#B45309",
    ];
    let pieChartData = Object.keys(categoryMap).map((key, index) => ({
      name: key,
      value:
        totalAssignedCategoryItems > 0
          ? Math.round((categoryMap[key] / totalAssignedCategoryItems) * 100)
          : 0,
      color: defaultCategoryColors[index % defaultCategoryColors.length],
    }));

    if (pieChartData.length === 0) {
      pieChartData = [
        { name: "Quran & Tajweed", value: 100, color: "#1B4332" },
      ];
    }

    // --- টাইমলাইন চার্ট জেনারেটর ---
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const timelineData = monthNames.map((m) => ({
      month: m,
      courses: 0,
      shop: 0,
    }));

    allApprovedEnrollments.forEach((enroll) => {
      if (enroll?.createdAt) {
        const date = new Date(enroll.createdAt);
        const mIdx = date.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          timelineData[mIdx].courses +=
            Number(enroll.paymentDetails?.amountPaid) || 0;
        }
      }
    });

    allDeliveredOrders.forEach((order) => {
      if (order?.createdAt) {
        const date = new Date(order.createdAt);
        const mIdx = date.getMonth();
        if (mIdx >= 0 && mIdx < 12) {
          timelineData[mIdx].shop += Number(order.totalAmount) || 0;
        }
      }
    });

    // --- টপ কোর্স ট্র্যাকিং ---
    const topCoursesMap = {};
    allEnrollmentsForTopCourses.forEach((enroll) => {
      if (enroll?.course) {
        const cId = enroll.course.toString();
        const amt = Number(enroll?.paymentDetails?.amountPaid) || 0;
        if (!topCoursesMap[cId]) topCoursesMap[cId] = { count: 0, revenue: 0 };
        topCoursesMap[cId].count += 1;
        topCoursesMap[cId].revenue += amt;
      }
    });

    const sortedTopCoursesRaw = Object.keys(topCoursesMap)
      .map((id) => ({
        _id: id,
        count: topCoursesMap[id].count,
        revenue: topCoursesMap[id].revenue,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const courseIds = sortedTopCoursesRaw.map((c) => c._id);
    const fetchedCoursesDetails = await Course.find({
      _id: { $in: courseIds },
    }).lean();

    const structuredTopCourses = sortedTopCoursesRaw.map((rawCourse) => {
      const matchedDetails = fetchedCoursesDetails.find(
        (f) => f?._id?.toString() === rawCourse?._id?.toString(),
      );
      return {
        title: matchedDetails?.title || "Premium Course Context",
        instructor: "Islamic Scholar",
        students: rawCourse.count,
        rating: 4.9,
        revenue: `৳${rawCourse.revenue.toLocaleString()}`,
        level:
          matchedDetails?.courseCategoryType === "academic"
            ? "Academic"
            : "All Levels",
        emoji: "📖",
      };
    });

    // --- রিসেন্ট অর্ডার ট্র্যাকিং ---
    const structuredRecentOrders = recentOrdersList.map((ord) => {
      const initials = ord.customerDetails?.name
        ? ord.customerDetails.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "G";
      return {
        id: `#ORD-${ord._id?.toString().slice(-4).toUpperCase()}`,
        customer: ord.customerDetails?.name || "Guest Customer",
        product: "Academy Accessories",
        amount: `৳${(Number(ord.totalAmount) || 0).toLocaleString()}`,
        status: ord.orderStatus
          ? ord.orderStatus.charAt(0).toUpperCase() + ord.orderStatus.slice(1)
          : "Pending",
        date: ord.createdAt
          ? new Date(ord.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "Jun 22",
        avatar: initials,
      };
    });

    // ফাইনাল লাইভ সাকসেস রেসপন্স অবজেক্ট পাসিং
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents: totalStudentsCount.toLocaleString(),
          activeCourses: activeCoursesCount.toString(),
          grossRevenue: `৳${totalGrossRevenue.toLocaleString()}`,
          pendingOrders: pendingEnrollmentsCount.toString(),
        },
        charts: {
          timelineData,
          pieChartData,
        },
        topCourses: structuredTopCourses,
        recentOrders: structuredRecentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Global Dashboard Overview Logic Exception: " + error.message,
    });
  }
};


module.exports = {
  createAdminNotice,
  getAllAdminNotices,
  updateAdminNotice,
  deleteAdminNotice,
  getAdminDashboardOverview,
};
