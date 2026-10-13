const mongoose = require("mongoose");

const PostReportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ["post", "comment", "user"],
      required: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who is being reported
    },

    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who reported
    },

    reason: {
      type: String,

      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    screenshots: [
      {
        type: String, // cloud URLs
      },
    ],

    status: {
      type: String,
      enum: ["pending", "reviewed", "rejected"],
      default: "pending",
    },

    adminAction: {
      type: String,
      enum: [
        "none",
        "post-deleted",
        "comment-deleted",
        "user-warned",
        "user-blocked",
        "no-action",
      ],
      default: "none",
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

module.exports = mongoose.model("PostReport", PostReportSchema);
