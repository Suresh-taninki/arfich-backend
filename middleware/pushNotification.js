const admin = require("./fireBase");
const User = require("../models/user");

exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);
    console.log(user)
    if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
      return;
    }

    const image = data?.imageUrl || data?.image || null;

    const dataPayload = {};
    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;
        dataPayload[key] = String(value);
      }
    }
    const message = {
      tokens: user.deviceTokens, // ✅ array here
      notification: {
        title,
        body,
        ...(image ? { image: String(image) } : {}),
      },
      data: {
        ...dataPayload,
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(response)

    console.log("Push success:", response.successCount);
    console.log("Push failure:", response.failureCount);

    // 🔥 Optional: Remove invalid tokens automatically
    // if (response.failureCount > 0) {
    //   const invalidTokens = [];

    //   response.responses.forEach((resp, idx) => {
    //     if (!resp.success) {
    //       invalidTokens.push(user.deviceTokens[idx]);
    //     }
    //   });

    //   if (invalidTokens.length > 0) {
    //     await User.findByIdAndUpdate(userId, {
    //       $pull: { deviceTokens: { $in: invalidTokens } }
    //     });
    //   }
    // }
  } catch (error) {
    console.log("❌ PUSH ERROR:", error.message);
  }
};
