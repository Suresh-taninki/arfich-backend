const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    // Who receives the notification (target user)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who triggered the action (liker, commenter, inviter)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    // Main type of notification
    type: {
      type: String,
      enum: [
        "like",
        "group_post_like",
        "group_post_comment",
        "comment",
        "reply",
        "follow",
        "following-back",
        "group-invite",
        "group-join",
        "mention",
        "group-join-request",
        "new_post",
        "group_post",
        "chat-message",
        "share_success",
        "announcement"
      ],
      required: true,
    },

    // Basic message shown on UI
    message: { type: String, required: true },

    // Useful for showing sender info without extra DB call
    senderName: { type: String, default: null },
    senderImage: { type: String, default: null },

    // Group-specific data
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    groupName: { type: String, default: null },
    groupLogo: { type: String, default: null },
    // Post-related
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    postContent: { type: String, default: null },

    // Comment-related
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    commentText: { type: String, default: null },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },

    // Chat-related
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", default: null },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    serviceName: { type: String, default: null },

    // Reference to ANY action (messageId, inviteId, etc.)
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Image preview (for likes/comments)
    media: [{ type: String }],

    // Group invite status
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "unread"],
      default: "pending",
    },
    // Read status
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);


