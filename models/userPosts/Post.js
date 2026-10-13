const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    media: [{ type: String }],   // 👈 IMPORTANT

    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },

    privacy: { type: String, enum: ["Public", "Friends","Private"], default: "Public" },
    // 🔗 For copy/share link
    slug: { type: String, unique: true, sparse: true },

    // 🔁 Repost/Share count
    repostCount: { type: Number, default: 0 },

    // 💾 Saved Users
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // 👁️ Hidden Posts
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // 👎 Not interested feedback
    notInterestedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
