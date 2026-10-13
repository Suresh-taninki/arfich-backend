const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // 👇 What kind of chat is this?
    chatType: {
      type: String,
      enum: ["direct", "service"],
      required: true,
    },

    // 👇 Only for service chat
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },

    // 👇 Who is service provider (optional but useful)
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastMessage: { type: String },
    lastMessageTime: Date,
  },
  { timestamps: true }
);

// Performance indexes
ChatSchema.index({ members: 1 });
ChatSchema.index({ serviceId: 1 });
ChatSchema.index({ providerId: 1 });

module.exports = mongoose.model("Chat", ChatSchema);
