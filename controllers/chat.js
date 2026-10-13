const Chat=require("../models/chats/chat")
const Message=require("../models/chats/message")
const User=require("../models/user")
const GroupMember=require("../models/group/groupMembers")
const Group=require("../models/group/group")
const Notification=require("../models/notifications")
const Service=require("../models/service")
const { createOrUpdateNotification, createGroupInviteNotification } = require("../middleware/notification")
const { sendPushNotification } = require("../middleware/pushNotification")
const formatTimeAgo = (date) => {
  if (!date) return "";
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 30) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

exports.createOrGetChat = async (req, res) => {
  try {
    const { senderId, receiverId, chatType, serviceId } = req.body;

    let chat = await Chat.findOne({
      members: { $all: [senderId, receiverId] },
      chatType,
      serviceId: serviceId || null
    });

    if (!chat) {
      chat = await Chat.create({
        members: [senderId, receiverId],
        chatType,
        serviceId: serviceId || null
      });
    }

    res.json({ success: true, chat });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, senderId, receiverId, text, media, type } = req.body;

    if (!chatId || !senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        message: "Missing fields",
      });
    }

    // Fetch sender & receiver for notification data
    const sender = await User.findById(senderId).select("profileName profileImage");
    const receiver = await User.findById(receiverId).select("deviceToken profileName");

    if (!sender || !receiver) {
      return res.status(404).json({
        success: false,
        message: "Sender or Receiver not found",
      });
    }

    /* =====================================================
          1️⃣ CREATE MESSAGE
    ====================================================== */
    const message = await Message.create({
      chatId,
      senderId,
      receiverId,
      text,
      media,
      messageType: type || "text",
    });

    /* =====================================================
          2️⃣ UPDATE CHAT PREVIEW
    ====================================================== */
    const previewText =
      message.messageType === "image"
        ? "📷 Photo"
        : message.messageType === "video"
        ? "🎥 Video"
        : message.messageType === "audio"
        ? "🎤 Audio Message"
        : text || "New Message";

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: previewText,
      lastMessageTime: new Date(),
    });

    /* =====================================================
          3️⃣ CREATE DB NOTIFICATION
    ====================================================== */

    // await Notification.create({
    //   userId: receiverId,
    //   senderId,
    //   senderName: sender.profileName,
    //   senderImage: sender.profileImage,
    //   type: "chat-message",
    //   message: previewText,
    //   chatId,
    //   referenceId: message._id,
    //   status: "unread",
    // });

    /* =====================================================
          4️⃣ SEND PUSH NOTIFICATION TO RECEIVER
    ====================================================== */

    const chat = await Chat.findById(chatId).select("chatType serviceId").lean();
    let serviceName = null;
    if (chat?.chatType === "service" && chat?.serviceId) {
      const service = await Service.findById(chat.serviceId).select("brandName").lean();
      serviceName = service?.brandName || null;
    }

    const pushTitle = serviceName
      ? `${serviceName}`
      : `${sender.profileName} sent a message`;

    await sendPushNotification(
      receiverId,
      pushTitle,
      previewText,
      {
        type: "chat-message",
        chatId: chatId.toString(),
        messageId: message._id.toString(),
        senderId: senderId.toString(),
        serviceId: chat?.serviceId ? chat.serviceId.toString() : "",
        serviceName: serviceName ? String(serviceName) : "",
      }
    );

    /* =====================================================
          5️⃣ SEND RESPONSE
    ====================================================== */
    return res.json({
      success: true,
      message,
    });

  } catch (err) {
    console.error("SEND MESSAGE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



exports.getMessages = async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    if (!chatId || !userId) {
      return res.status(400).json({
        success: false,
        message: "chatId and userId required"
      });
    }

    // 1️⃣ Load messages
    let messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    // 2️⃣ Collect all groupIds from invite messages
    const groupIds = [
      ...new Set(
        messages
          .filter(
            (msg) =>
              msg.messageType === "group-invite" &&
              msg.groupId
          )
          .map((msg) => msg.groupId.toString())
      )
    ];

    let groupMap = {};
    let memberStatusMap = {};

    /* ======================================================
       3️⃣ Fetch GROUP DETAILS
    ======================================================= */
    if (groupIds.length > 0) {
      const groups = await Group.find({ _id: { $in: groupIds } })
        .select("name groupIcon groupBanner")
        .lean();

      groupMap = Object.fromEntries(
        groups.map((g) => [g._id.toString(), g])
      );

      /* ======================================================
         4️⃣ Fetch GROUP MEMBER STATUS for this user
      ======================================================= */
      const memberDocs = await GroupMember.find({
        groupId: { $in: groupIds },
        userId
      })
        .select("groupId status")
        .lean();

      memberStatusMap = Object.fromEntries(
        memberDocs.map((m) => [m.groupId.toString(), m.status])
      );
    }

    /* ======================================================
       5️⃣ Attach group + groupMember status to each invite msg
    ======================================================= */
    messages = messages.map((msg) => {
      if (
        msg.messageType === "group-invite" &&
        msg.groupId
      ) {
        const gid = msg.groupId.toString();
        return {
          ...msg,
          group: groupMap[gid] || null,
          groupStatus: memberStatusMap[gid] || "none", // ✔ approved | pending | rejected | none
        };
      }
      return msg;
    });

    return res.json({
      success: true,
      messages
    });

  } catch (err) {
    console.error("GET MESSAGES ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};




exports.getUserChats = async (req, res) => {
  try {
    const userId = req.params.userId;

    const chats = await Chat.find({
      members: userId
    })
      .sort({ lastMessageTime: -1 })
      .lean();

    const formatted = await Promise.all(
      chats.map(async (chat) => {

        const chatType = chat.chatType || "direct";

        const otherUser = chat.members.find(
          (p) => p.toString() !== userId
        );

        const user = await User.findById(otherUser)
          .select("profileName profileImage isEmailVerified")
          .lean();

        // 🔹 DIRECT CHAT
        if (chatType === "direct") {
          return {
            chatId: chat._id,
            chatType: "direct",
            receiverId: user?._id,
            title: user?.profileName,
            avatar: user?.profileImage,
            isEmailVerified: user?.emailVerified || false,
            lastMessage: chat.lastMessage,
            lastMessageTime: chat.lastMessageTime,
            timeAgo: formatTimeAgo(chat.lastMessageTime),
          };
        }

        // 🔹 SERVICE CHAT
        if (chatType === "service") {

          let serviceName = "";
          let isVerified = false;
          let logo=""

          if (chat.serviceId) {
            const service = await Service.findById(chat.serviceId)
              .select("brandName logo mailVerfied")
              .lean();

            serviceName = service?.brandName || "Service";
            isVerified = service?.mailVerfied || false;
            logo=service?.logo
          }

          return {
            chatId: chat._id,
            chatType: "service",
            receiverId: user?._id,
            title: serviceName,                 // ✅ service name
            avatar: logo,
            owner:user?.profileName,
            serviceId: chat.serviceId,
            isEmailVerified: isVerified,        // ✅ service verified
            lastMessage: chat.lastMessage,
            lastMessageTime: chat.lastMessageTime,
            timeAgo: formatTimeAgo(chat.lastMessageTime),
          };
        }

      })
    );

    res.json({
      success: true,
      chats: formatted.filter(Boolean)
    });

  } catch (err) {
    console.log("GET USER CHATS ERROR:", err);
    res.status(500).json({ success: false });
  }
};



// POST /user/chat/start
exports.startChat = async (req, res) => {
  try {
    const { userId, receiverId, chatType, serviceId } = req.body;

    if (!userId || !receiverId || !chatType) {
      return res.status(400).json({
        success: false,
        message: "userId, receiverId and chatType are required",
      });
    }

    // Validate chatType
    if (!["direct", "service"].includes(chatType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chatType",
      });
    }

    let chatQuery = {
      members: { $all: [userId, receiverId] },
      chatType,
    };

    // If service chat → must match serviceId
    if (chatType === "service") {
      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: "serviceId required for service chat",
        });
      }
      chatQuery.serviceId = serviceId;
    }

    let chat = await Chat.findOne(chatQuery);

    // If chat doesn't exist → create
    if (!chat) {
      chat = await Chat.create({
        members: [userId, receiverId],
        chatType,
        serviceId: chatType === "service" ? serviceId : null,
        lastMessage: "",
        lastMessageTime: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      chatId: chat._id,
      chatType: chat.chatType,
    });

  } catch (err) {
    console.error("Start Chat Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


exports.sendInviteMessage = async (req, res) => {
  try {
    const { senderId, receiverId, groupId } = req.body;

    if (!senderId || !receiverId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    /* ==========================================================
       FETCH USERS + GROUP
    ========================================================== */

    const sender = await User.findById(senderId)
      .select("profileName profileImage");

    const receiver = await User.findById(receiverId)
      .select("deviceToken profileName");

    const group = await Group.findById(groupId)
      .select("name groupIcon");
    console.log(sender,receiver,group)

    if (!sender || !receiver || !group) {
      return res.status(404).json({
        success: false,
        message: "Invalid data"
      });
    }



    /* ==========================================================
       CREATE GROUP MEMBER (ONLY IF NOT EXISTS)
    ========================================================== */

    const existingMember = await GroupMember.findOne({
      groupId,
      userId: receiverId
    });

    let groupMember = existingMember;

    if (!existingMember) {
      groupMember = await GroupMember.create({
        groupId,
        userId: receiverId,
        role: "member",
        status: "pending"
      });
    }

    /* ==========================================================
       FIND / CREATE DIRECT CHAT
    ========================================================== */

    let chat = await Chat.findOne({
      members: { $all: [senderId, receiverId] },
      chatType: "direct"
    });

    if (!chat) {
      chat = await Chat.create({
        members: [senderId, receiverId],
        chatType: "direct",
        lastMessage: "",
        lastMessageTime: new Date()
      });
    }

    /* ==========================================================
       CREATE INVITE MESSAGE
    ========================================================== */

    const message = await Message.create({
      chatId: chat._id,
      senderId,
      receiverId,
      messageType: "group-invite",
      text: `You are invited to join ${group.name}`,
      groupId,
      actionStatus: "pending"
    });

    /* ==========================================================
       UPDATE CHAT PREVIEW
    ========================================================== */

    chat.lastMessage = message.text;
    chat.lastMessageTime = message.createdAt;

    await chat.save();

    /* ==========================================================
       CREATE NOTIFICATION + PUSH
    ========================================================== */

    await createGroupInviteNotification({
      sender,
      receiver,
      group,
      message
    });

    /* ==========================================================
       RESPONSE
    ========================================================== */

    return res.json({
      success: true,
      inviteMessage: message,
      groupMember: {
        _id: groupMember._id,
        groupId: groupMember.groupId,
        userId: groupMember.userId,
        role: groupMember.role,
        status: groupMember.status
      }
    });

  } catch (err) {

    console.error("SEND INVITE ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
};



exports.respondToInvite = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, groupId, userId } = req.body;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    // Validate invite message
    const message = await Message.findById(messageId);

    if (!message || message.messageType !== "group-invite") {
      return res.status(400).json({
        success: false,
        message: "Invalid invite message",
      });
    }

    /* ===========================================================
       1️⃣ FIND GROUP MEMBER ENTRY
    ============================================================ */
    let member = await GroupMember.findOne({ groupId, userId });

    if (!member) {
      // Create entry only if user accepts
      if (action === "accept") {
        member = await GroupMember.create({
          groupId,
          userId,
          status: "approved"
        });
      } else {
        return res.json({
          success: true,
          status: "rejected",
          message: "Invite rejected"
        });
      }
    } else {
      // Update status if already exists
      member.status = action === "accept" ? "approved" : "rejected";
      await member.save();
    }

    /* ===========================================================
       2️⃣ DO NOT UPDATE MESSAGE STATUS ANYMORE
            (Your requirement)
    ============================================================ */

    return res.json({
      success: true,
      status: member.status,
      message:
        action === "accept"
          ? "User added to the group"
          : "User rejected the invite"
    });

  } catch (err) {
    console.error("RESPOND INVITE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


