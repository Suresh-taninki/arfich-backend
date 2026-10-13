const mongoose = require("mongoose");

const PrivacySettingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    whoCanViewProfile: { type: String, enum: ["Everyone", "Friends", "Only Me"], default: "Everyone" },
    whoCanAddMeToGroup: { type: String, enum: ["Everyone", "Friends", "No One"], default: "Everyone" },
    whoCanSeeOnlineStatus: { type: String, enum: ["Everyone", "Friends", "Only Me"], default: "Friends" }
}, { timestamps: true });

module.exports = mongoose.model("PrivacySettings", PrivacySettingsSchema);
