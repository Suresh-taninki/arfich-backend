const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    // Multiple banner images supported
    images: {
      type: [String],
      required: true,
    },

    // Main title or tagline
    title: {
      type: String,
      trim: true,
    },

    // Short description for the ad
    description: {
      type: String,
      default: "",
    },

    // Where the ad should redirect when clicked
    redirectUrl: {
      type: String,
      default: null,
    },

    // Who uploaded this ad (Admin)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    // Ads can be Active / Inactive
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // Optional: schedule ad visibility
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },

    // Optional: priority — Higher number = appears first
    priority: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Advertisements", advertisementSchema);
