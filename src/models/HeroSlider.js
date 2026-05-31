const mongoose = require("mongoose");

const heroSliderSchema = new mongoose.Schema(
  {
    pageName: { type: String, default: "landing" },
    badgeText: { type: String, default: "ভর্তি চলছে" },
    title: { type: String, required: true },
    subtitle: { type: String },
    image: { type: String, required: true },
    primaryBtnText: { type: String, default: "ভর্তি হতে ক্লিক করুন" },
    primaryBtnLink: { type: String, default: "/admission" },
    secondaryBtnText: { type: String, default: "কোর্সসমূহ দেখুন" },
    secondaryBtnLink: { type: String, default: "/courses" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("HeroSlider", heroSliderSchema);