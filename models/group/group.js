const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    groupIcon:{ type: String },
    description: { type: String },
    groupBanner: { type: String }, // Optional banner for community
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    country:{ name: String, flag: String },
    state:{ name: String, flag: String },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rules: [{ type: String }],
    isPrivate: { type: Boolean, default: false }, // Private communities require approval
       idDeleted:
      { type: Boolean, default: false },
    isDeactivate: {
      type: Boolean, default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", GroupSchema);
