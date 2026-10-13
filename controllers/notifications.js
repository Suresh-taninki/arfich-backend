const Notification=require("../models/notifications")
const Message=require("../models/chats/message")
const Group=require("../models/group/group")
const User=require("../models/user");
const GroupMembers = require("../models/group/groupMembers");
const Followers=require("../models/followingfollowers/followersandfollowing")
const { createAnnouncementNotification } = require("../middleware/notification");
exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    /* ==========================================================
       1️⃣ GROUP INVITE DATA
    ========================================================== */

    const messageIds = notifications
      .filter(n => n.type === "group-invite")
      .map(n => n.referenceId);
    const messages = await Message.find({ _id: { $in: messageIds } })
      .select("senderId groupId status createdAt")
      .lean();
    const messageMap = {};
    messages.forEach(m => {
      messageMap[String(m._id)] = m;
    });
    const senderIds = [...new Set(messages.map(m => String(m.senderId)))];
    const senders = await User.find({ _id: { $in: senderIds } })
      .select("profileName profileImage")
      .lean();
    const senderMap = {};
    senders.forEach(s => {
      senderMap[String(s._id)] = s;
    });

    const groupIds = [...new Set(messages.map(m => String(m.groupId)))];
    const groups = await Group.find({ _id: { $in: groupIds } })
      .select("name groupIcon")
      .lean();
    const groupMap = {};
    groups.forEach(g => {
      groupMap[String(g._id)] = g;
    });

    const groupMembers = await GroupMembers.find({
      userId,
      groupId: { $in: groupIds }
    })
      .select("groupId status _id")
      .lean();

    const groupMemberMap = {};
    groupMembers.forEach(g => {
      groupMemberMap[String(g.groupId)] = g;
    });

    /* ==========================================================
       2️⃣ GROUP JOIN REQUEST DATA
    ========================================================== */

    const joinReqIds = notifications
      .filter(n => n.type === "group-join-request")
      .map(n => n.referenceId);

    const joinReqDocs = await GroupMembers.find({
      _id: { $in: joinReqIds }
    })
      .select("groupId userId status")
      .lean();

    const joinReqMap = {};
    joinReqDocs.forEach(j => {
      joinReqMap[String(j._id)] = j;
    });

    const joinReqGroupIds = [...new Set(joinReqDocs.map(j => String(j.groupId)))];

    const joinGroups = await Group.find({ _id: { $in: joinReqGroupIds } })
      .select("name groupIcon")
      .lean();

    const joinGroupMap = {};
    joinGroups.forEach(g => {
      joinGroupMap[String(g._id)] = g;
    });

    const joinSenderIds = [...new Set(joinReqDocs.map(j => String(j.userId)))];

    const joinSenders = await User.find({ _id: { $in: joinSenderIds } })
      .select("profileName profileImage")
      .lean();

    const joinSenderMap = {};
    joinSenders.forEach(s => {
      joinSenderMap[String(s._id)] = s;
    });

    /* ==========================================================
       3️⃣ FOLLOW STATUS (OPTIMIZED)
    ========================================================== */

    const followNotifications = notifications.filter(n => n.type === "follow");

    const followSenderIds = followNotifications.map(n => String(n.senderId));

    // combine ALL sender ids
    const allSenderIds = [
      ...new Set([...followSenderIds, ...joinSenderIds])
    ];

    const followDocs = await Followers.find({
      follower: userId,
      following: { $in: allSenderIds }
    })
      .select("following")
      .lean();

    const followMap = {};
    followDocs.forEach(f => {
      followMap[String(f.following)] = true;
    });

    /* ==========================================================
       4️⃣ FINAL RESPONSE
    ========================================================== */

    const finalList = notifications.map(n => {

      if (n.type === "group-invite") {
        const msg = messageMap[String(n.referenceId)];
        const sender = senderMap[msg?.senderId];
        const group = groupMap[msg?.groupId];
        const gm = groupMemberMap[msg?.groupId];
        return {
          _id: n._id,
          type: n.type,
          senderId: msg?.senderId || null,
          senderName: sender?.profileName || "Unknown",
          senderAvatar: sender?.profileImage || null,
          groupId: msg?.groupId || null,
          groupName: group?.name || "",
          groupIcon: group?.groupIcon || null,
          messageId: msg?._id,
          status: msg?.status || "pending",
          groupStatus: gm?.status || "pending",
          requestId: gm?._id || null,
          followedStatus: msg?.senderId
            ? followMap[String(msg.senderId)] || false
            : false,
          message: n.message,
          isRead: n.isRead,
          createdAt: n.createdAt
        };
      }

      if (n.type === "group-join-request") {
        const req = joinReqMap[String(n.referenceId)];
        const sender = joinSenderMap[req?.userId];
        const group = joinGroupMap[req?.groupId];

        return {
          _id: n._id,
          type: n.type,

          senderId: req?.userId || null,
          senderName: sender?.profileName || "Unknown",
          senderAvatar: sender?.profileImage || null,

          groupId: req?.groupId || null,
          groupName: group?.name || "",
          groupIcon: group?.groupIcon || null,

          requestId: req?._id || null,
          groupStatus: req?.status || "pending",

          followedStatus: req?.userId
            ? followMap[String(req.userId)] || false
            : false,

          message: n.message,
          isRead: n.isRead,
          createdAt: n.createdAt
        };
      }

      if (n.type === "follow") {
        return {
          ...n,
          followedStatus: n.senderId
            ? followMap[String(n.senderId)] || false
            : false
        };
      }

      return n;
    });

    return res.json({
      success: true,
      notifications: finalList
    });

  } catch (err) {
    console.log("Notification Error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
exports.sendAnnouncement = async (req, res) => {
  try {
    const { userIds, sendToAll, title, message, data } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    let targets = Array.isArray(userIds) ? userIds : [];
    if (sendToAll) {
      const users = await User.find({}).select("_id").lean();
      targets = users.map(u => u._id);
    }

    await createAnnouncementNotification({
      userIds: targets,
      title,
      message,
      data: data || {},
    });

    return res.json({ success: true, count: targets.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
exports.readNotification = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("dnfoeroejroerj")

    await Notification.findByIdAndUpdate(id, {
      isRead: true,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
