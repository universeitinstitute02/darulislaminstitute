const Donation = require("../models/Donation");
const DonationCampaign = require("../models/DonationCampaign");

// ==========================================
// 📢 DONATION CAMPAIGN (PROKOLPO) CRUD APIS
// ==========================================

// Create Donation Campaign (Admin Only)
const createCampaign = async (req, res) => {
  try {
    const { title, description, goalAmount } = req.body;

    if (!title || !description || !goalAmount) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Campaign project image is required" });
    }

    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-");

    const existingCampaign = await DonationCampaign.findOne({ slug });
    if (existingCampaign) {
      return res
        .status(400)
        .json({ message: "A campaign with a similar title already exists" });
    }

    const campaign = await DonationCampaign.create({
      title,
      slug,
      description,
      image: req.file.path,
      goalAmount: Number(goalAmount),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Donation campaign created successfully",
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Active Campaigns (Public View)
const getPublicCampaigns = async (req, res) => {
  try {
    const campaigns = await DonationCampaign.find({ isActive: true }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Campaigns (Admin Dashboard View)
const getAdminCampaigns = async (req, res) => {
  try {
    const campaigns = await DonationCampaign.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Campaign (Admin Only)
const updateCampaign = async (req, res) => {
  try {
    let bodyData = req.body;
    if (typeof req.body === "string") {
      try {
        bodyData = JSON.parse(req.body);
      } catch (e) {
        bodyData = {};
      }
    }

    if (!bodyData && !req.file) {
      return res.status(400).json({
        success: false,
        message: "Payload data or file not found.",
      });
    }

    const { title, description, goalAmount, isActive } = bodyData;

    const campaign = await DonationCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Donation campaign not found" });
    }

    let currentImage = campaign.image;
    if (req.file) {
      currentImage = req.file.path || req.file.location || currentImage;
    } else if (bodyData.image) {
      currentImage = bodyData.image;
    }

    let updateData = {
      description: description || campaign.description,
      image: currentImage,
      goalAmount: goalAmount !== undefined ? goalAmount : campaign.goalAmount,
      isActive: isActive !== undefined ? isActive : campaign.isActive,
    };

    if (title && title.trim() !== campaign.title) {
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-");

      const existingCampaign = await DonationCampaign.findOne({
        slug,
        _id: { $ne: req.params.id },
      });
      if (existingCampaign) {
        return res
          .status(400)
          .json({ message: "A campaign with a similar title already exists" });
      }
      updateData.title = title.trim();
      updateData.slug = slug;
    }

    const updatedCampaign = await DonationCampaign.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Campaign parameters updated successfully",
      data: updatedCampaign,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Campaign (Admin Only)
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await DonationCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: "Donation campaign not found" });
    }

    await campaign.deleteOne();
    res.status(200).json({
      success: true,
      message: "Donation campaign tracking record deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 💳 DONOR TRANSACTIONS HANDLING APIS
// ==========================================

const createDonation = async (req, res) => {
  try {
    const {
      name,
      phone,
      amount,
      method,
      campaignId,
      senderNumber,
      address,
      trxId,
    } = req.body;

    if (!amount || Number(amount) < 1) {
      return res
        .status(400)
        .json({ message: "Invalid donation amount specified" });
    }

    if (campaignId && campaignId !== "general") {
      const campaignExists = await DonationCampaign.findOne({
        _id: campaignId,
        isActive: true,
      });
      if (!campaignExists) {
        return res.status(404).json({
          message: "Selected donation project is inactive or unavailable",
        });
      }
    }

    if (method !== "bank") {
      if (!senderNumber || !trxId) {
        return res.status(400).json({
          message:
            "Sender number and Transaction ID are required for mobile banking",
        });
      }

      const duplicateTrx = await Donation.findOne({ trxId: trxId.trim() });
      if (duplicateTrx) {
        return res.status(400).json({
          message: "This Transaction ID has already been verified or submitted",
        });
      }
    }

    const donation = await Donation.create({
      name,
      phone,
      amount: Number(amount),
      method,
      campaignId: campaignId || "general",
      senderNumber: method !== "bank" ? senderNumber : undefined,
      trxId: method !== "bank" ? trxId.trim() : undefined,
      address,
    });

    res.status(201).json({
      success: true,
      message: "Donation record recorded successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDonationLogs = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const logs = await Donation.find(query)
      .populate("actionBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation)
      return res.status(404).json({ message: "Donation entry not found" });
    if (donation.status !== "pending")
      return res
        .status(400)
        .json({ message: "This entry is already resolved" });

    donation.status = "approved";
    donation.actionBy = req.user._id;
    donation.resolvedAt = new Date();
    await donation.save();

    if (donation.campaignSlug && donation.campaignSlug !== "general") {
      await DonationCampaign.findOneAndUpdate(
        { slug: donation.campaignSlug },
        { $inc: { raisedAmount: donation.amount } },
      );
    }

    res.status(200).json({
      success: true,
      message: "Donation entry verified and approved successfully",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const rejectDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation)
      return res.status(404).json({ message: "Donation entry not found" });
    if (donation.status !== "pending")
      return res
        .status(400)
        .json({ message: "This entry is already resolved" });

    donation.status = "rejected";
    donation.actionBy = req.user._id;
    donation.resolvedAt = new Date();
    await donation.save();

    res.status(200).json({
      success: true,
      message: "Donation tracking entry marked as rejected",
      data: donation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Donation Permanently
const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: "Donation entry record not found" 
      });
    }

    await donation.deleteOne();

    res.status(200).json({
      success: true,
      message: "Donation log tracking entry permanently deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCampaign,
  getPublicCampaigns,
  getAdminCampaigns,
  updateCampaign,
  deleteCampaign,
  createDonation,
  getDonationLogs,
  approveDonation,
  rejectDonation,
  deleteDonation,
};
