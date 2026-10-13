const mongoose = require("mongoose");

const PostReportSchema = new mongoose.Schema(
  {
   
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who is being reported
    },

    blockedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who reported
    },

  

    

    status: {
      type: String,
      enum: ["pending", "reviewed", "rejected"],
      default: "pending",
    },

    

    adminNotes: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("blockedUser", PostReportSchema);
