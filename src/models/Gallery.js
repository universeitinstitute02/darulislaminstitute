const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Gallery title is required"],
      trim: true,
    },
    assetType: {
      type: String,
      enum: ["image", "video"],
      required: [true, "Asset type (image or video) is required"],
    },
    image: [
      {
        type: String,
        required: [true, "At least one asset URL is required"],
      },
    ],
    event: {
      type: String,
      required: [true, "Event category or tag is required"],
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Gallery", gallerySchema);