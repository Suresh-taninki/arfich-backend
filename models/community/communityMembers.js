const mongoose = require("mongoose");

const CommunityMemberSchema = new mongoose.Schema(
  {
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "moderator", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true }); // 🚀 prevents duplicate join

module.exports = mongoose.model("CommunityMember", CommunityMemberSchema);
