const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    text: { type: String },

      messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "audio",
        "system",
        "group-invite",   // ✅ ADDED
        "group-action",
        "post-link",
        "service-link"
      ],
      default: "text",
    },

    media: [{ type: String }],

    // For service/group approval flow
    actionStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    isSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Performance
MessageSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
