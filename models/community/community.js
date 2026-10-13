const mongoose = require("mongoose");

const CommunitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    bannerImage: { type: String }, // Optional banner for community
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    rules: [{ type: String }],
    isPrivate: { type: Boolean, default: false } // Private communities require approval
  },
  { timestamps: true }
);

module.exports = mongoose.model("Community", CommunitySchema);
