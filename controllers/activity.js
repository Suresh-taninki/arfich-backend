const Activity=require("../models/activity")
exports.logActivity = async (userId, postId, type, details,communityId) => {
    try {
        await Activity.create({ userId, postId, type, details,communityId });
    } catch (error) {
        console.error("Error logging activity:", error);
    }
};

