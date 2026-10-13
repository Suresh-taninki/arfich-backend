const PrivacySettings = require("../models/privacySetting");

exports.updatedPrivacy=async (req, res) => {
    try {
        const { whoCanViewProfile, whoCanAddMeToGroup, whoCanSeeOnlineStatus } = req.body;

        const updatedPrivacy = await PrivacySettings.findOneAndUpdate(
            { userId: req.user.id },
            { whoCanViewProfile, whoCanAddMeToGroup, whoCanSeeOnlineStatus },
            { new: true, upsert: true } // Create if not exists
        );

        res.status(200).json({ message: "Privacy settings updated successfully", privacySettings: updatedPrivacy });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}

exports.getPrivacy=async (req, res) => {
    try {
        const privacySettings = await PrivacySettings.findOne({ userId: req.user.id });
        if (!privacySettings) {
            return res.status(404).json({ error: "Privacy settings not found" });
        }
        res.status(200).json(privacySettings);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
