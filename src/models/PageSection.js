const mongoose = require("mongoose");

const pageSectionSchema = new mongoose.Schema(
  {
    pageName: { 
      type: String, 
      required: true, 
      enum: ["landing", "shop", "about", "contact"]
    },
    sectionName: { 
      type: String, 
      required: true
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

pageSectionSchema.index({ pageName: 1, sectionName: 1 }, { unique: true });

module.exports = mongoose.model("PageSection", pageSectionSchema);