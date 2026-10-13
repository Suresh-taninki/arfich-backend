const Notification = require("../models/notifications");
const User = require("../models/user");
const Post = require("../models/userPosts/Post");
const Group = require("../models/group/group");
const Message = require("../models/chats/message");
const { sendPushNotification } = require("./pushNotification");
const Follow = require("../models/followingfollowers/followersandfollowing");
const GroupMember = require("../models/group/groupMembers");

// Remove duplicate notifications (same sender + type + post/comment/group)
async function removeDuplicate(filter) {
  await Notification.deleteMany(filter);
}

function trimText(text, maxLen) {
  const s = text === undefined || text === null ? "" : String(text);
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 3))}...`;
}

function getFirstMediaUrl(media) {
  const mediaArray = Array.isArray(media) ? media : media ? [media] : [];
  return mediaArray?.[0] || "";
}

exports.createReplyNotification = async ({ post, parentComment, replyComment, replierId }) => {
  try {
    const replier = await User.findById(replierId).select("profileName profileImage");
    if (!replier) return;

    const mediaArray = Array.isArray(post.media)
      ? post.media
      : post.media
        ? [post.media]
        : [];

    let group = null;
    if (post.groupId) {
      group = await Group.findById(post.groupId)
        .select("name groupIcon")
        .lean();
    }

    const postOwnerId = post.userId?._id || post.userId;

    const parentOwnerId = parentComment?.userId?._id || parentComment?.userId || parentComment?._id;
    const parentCommentId = parentComment?.postId ? parentComment._id : replyComment?.parentId;

    // notify parent comment owner (if not self)
    if (parentOwnerId && parentOwnerId.toString() !== replierId.toString()) {
      const title = post.groupId
        ? `${group?.name} ↩️`
        : `${replier.profileName} replied to your comment ↩️`;

      const body = post.groupId
        ? parentComment?.text
          ? `${replier.profileName} replied: "${parentComment.text.substring(0, 45)}${
              parentComment.text.length > 45 ? "..." : ""
            }"`
          : post.content
          ? `${replier.profileName} replied on: "${post.content.substring(0, 40)}${
              post.content.length > 40 ? "..." : ""
            }"`
          : `${replier.profileName} replied to your comment.`
        : parentComment?.text
        ? `"${parentComment.text.substring(0, 50)}${
            parentComment.text.length > 50 ? "..." : ""
          }"`
        : post.content
        ? `On post: "${post.content.substring(0, 45)}${
            post.content.length > 45 ? "..." : ""
          }"`
        : "Tap to view the discussion.";

      await Notification.create({
        userId: parentOwnerId,
        senderId: replierId,
        type: "reply",
        message: title,
        senderName: replier.profileName,
        senderImage: replier.profileImage,
        postId: post._id,
        postContent: post.content || null,
        groupId: post.groupId || null,
        groupName: group?.name || null,
        groupLogo: group?.groupIcon || null,
        commentId: replyComment._id,
        commentText: replyComment.text || null,
        parentCommentId: parentCommentId || null,
        media: mediaArray,
        isRead: false,
      });

      await sendPushNotification(
        parentOwnerId,
        title,
        body,
        {
          type: "reply",
          notificationType: post.groupId ? "reply_group_comment" : "reply_comment",
          postId: post._id.toString(),
          groupId: post.groupId ? String(post.groupId) : "",
          commentId: replyComment._id.toString(),
          parentCommentId: parentCommentId ? parentCommentId.toString() : "",
          openComments: "1",
          highlightCommentId: replyComment._id.toString(),
        }
      );
    }

    // also notify post owner (if different from replier and parent owner)
    if (
      postOwnerId &&
      postOwnerId.toString() !== replierId.toString() &&
      (!parentOwnerId || postOwnerId.toString() !== parentOwnerId.toString())
    ) {
      const title = post.groupId
        ? `${group?.name} 💬`
        : `${replier.profileName} replied on your post 💬`;

      const body = post.groupId
        ? parentComment?.text
          ? `${replier.profileName}: "${parentComment.text.substring(0, 45)}${
              parentComment.text.length > 45 ? "..." : ""
            }"`
          : post.content
          ? `${replier.profileName} replied on: "${post.content.substring(0, 40)}${
              post.content.length > 40 ? "..." : ""
            }"`
          : `${replier.profileName} replied on your post.`
        : parentComment?.text
        ? `On comment: "${parentComment.text.substring(0, 50)}${
            parentComment.text.length > 50 ? "..." : ""
          }"`
        : post.content
        ? `On post: "${post.content.substring(0, 50)}${
            post.content.length > 50 ? "..." : ""
          }"`
        : "Your post is getting new replies.";

      await Notification.create({
        userId: postOwnerId,
        senderId: replierId,
        type: "reply",
        message: title,
        senderName: replier.profileName,
        senderImage: replier.profileImage,
        postId: post._id,
        postContent: post.content || null,
        groupId: post.groupId || null,
        groupName: group?.name || null,
        groupLogo: group?.groupIcon || null,
        commentId: replyComment._id,
        commentText: replyComment.text || null,
        parentCommentId: parentCommentId || null,
        media: mediaArray,
        isRead: false,
      });

      await sendPushNotification(
        postOwnerId,
        title,
        body,
        {
          type: "reply",
          notificationType: post.groupId ? "reply_group_post" : "reply_post",
          postId: post._id.toString(),
          commentId: replyComment._id.toString(),
          senderId: replierId.toString(),
          groupId: post.groupId ? String(post.groupId) : "",
          openComments: "1",
        }
      );
    }
  } catch (error) {
    console.log("❌ REPLY NOTIFICATION ERROR:", error.message);
  }
};

// ==========================================
// REPLY COMMENT OWNER MIDDLEWARE
// ==========================================

exports.replyCommentOwnerNotification = async ({
  post,
  parentComment,
  replyComment,
  replier,
  group,
  mediaArray,
  replierId,
}) => {
  const parentOwnerId =
    parentComment?.userId?._id ||
    parentComment?.userId;

  if (
    !parentOwnerId ||
    parentOwnerId.toString() ===
      replierId.toString()
  ) {
    return;
  }

  const title = `${replier.profileName} replied to your comment ↩️`;

  const body = parentComment?.text
    ? `"${parentComment.text.substring(0, 50)}${
        parentComment.text.length > 50 ? "..." : ""
      }" • On post: "${
        post.content?.substring(0, 45)
      }${post.content?.length > 45 ? "..." : ""}"`

    : post.content
    ? `On post: "${post.content.substring(0, 45)}${
        post.content.length > 45 ? "..." : ""
      }"`

    : replyComment?.text
    ? `"${replyComment.text.substring(0, 45)}${
        replyComment.text.length > 45 ? "..." : ""
      }"`

    : "";

  await sendPushNotification(
    parentOwnerId,
    title,
    body,
    {
      notificationType: "reply_comment",
      postId: post._id.toString(),
      commentId: replyComment._id.toString(),
      openComments: "1",
    }
  );
};

// ==========================================
// REPLY GROUP COMMENT OWNER MIDDLEWARE
// ==========================================

exports.replyGroupCommentNotification = async ({
  post,
  parentComment,
  replyComment,
  replier,
  group,
  mediaArray,
  replierId,
}) => {
  const parentOwnerId =
    parentComment?.userId?._id ||
    parentComment?.userId;

  if (
    !parentOwnerId ||
    parentOwnerId.toString() ===
      replierId.toString()
  ) {
    return;
  }

  const title = `${group?.name || "Group"}  ↩️`;

  const body = parentComment?.text
    ? `${replier.profileName}: "${
        parentComment.text.substring(0, 45)
      }${
        parentComment.text.length > 45 ? "..." : ""
      }" • On post: "${
        post.content?.substring(0, 40)
      }${post.content?.length > 40 ? "..." : ""}"`

    : post.content
    ? `${replier.profileName} replied on: "${
        post.content.substring(0, 40)
      }${
        post.content.length > 40 ? "..." : ""
      }"`

    : `${replier.profileName} replied to your comment.`;

  await sendPushNotification(
    parentOwnerId,
    title,
    body,
    {
      notificationType: "reply_group_comment",
      groupId: post.groupId.toString(),
      postId: post._id.toString(),
      commentId: replyComment._id.toString(),
      openComments: "1",
    }
  );
};

// ==========================================
// REPLY POST OWNER MIDDLEWARE
// ==========================================

exports.replyPostOwnerNotification = async ({
  post,
  parentComment,
  replyComment,
  replier,
  group,
  mediaArray,
  replierId,
}) => {
  const postOwnerId =
    post.userId?._id || post.userId;

  if (
    !postOwnerId ||
    postOwnerId.toString() ===
      replierId.toString()
  ) {
    return;
  }

  const title = `${replier.profileName} replied on your post 💬`;

  const body = parentComment?.text
    ? `On comment: "${
        parentComment.text.substring(0, 50)
      }${
        parentComment.text.length > 50 ? "..." : ""
      }" On Post: "${
        post.content?.substring(0, 45)
      }${post.content?.length > 45 ? "..." : ""}"`

    : post.content
    ? `On post: "${post.content.substring(0, 50)}${
        post.content.length > 50 ? "..." : ""
      }"`

    : replyComment?.text
    ? `"${replyComment.text.substring(0, 45)}${
        replyComment.text.length > 45 ? "..." : ""
      }"`

    : "";

  await sendPushNotification(
    postOwnerId,
    title,
    body,
    {
      notificationType: "reply_post",
      postId: post._id.toString(),
      commentId: replyComment._id.toString(),
      openComments: "1",
    }
  );
};

exports.createLikeNotification = async ({ post, likerId }) => {
  console.log("dldlfdl")
  try {
    const liker = await User.findById(likerId)
      .select("profileName profileImage");

    if (!liker) return;

    // post owner id
    const postOwnerId = post.userId?._id || post.userId;

    const mediaArray = Array.isArray(post.media)
      ? post.media
      : post.media
        ? [post.media]
        : [];

    // ===============================
    // GROUP POST LIKE
    // ===============================
    if (post.groupId) {
      const group = await Group.findById(post.groupId)
        .select("name groupIcon")
        .lean();

      await Notification.deleteMany({
        userId: postOwnerId,
        senderId: likerId,
        postId: post._id,
        groupId: post.groupId,
        type: "group_post_like",
      });

      const notif = await Notification.create({
        userId: postOwnerId,
        senderId: likerId,
        type: "group_post_like",
        message: `${liker.profileName} liked your post in ${group?.name || "group"}`,
        senderName: liker.profileName,
        senderImage: liker.profileImage,
        postId: post._id,
        postContent: post.content || null,
        groupId: post.groupId,
        groupName: group?.name || null,
        groupLogo: group?.groupIcon || null,
        media: mediaArray,
        isRead: false,
      });

      console.log("fkfkfkfk")
      await sendPushNotification(
        postOwnerId,
        `${group?.name || "Group"} ❤️`,
        `${liker.profileName} liked your group post${
          post.content
            ? `: "${post.content.substring(0, 60)}${post.content.length > 60 ? "..." : ""}"`
            : "."
        }`,
        {
          type: "group_post_like",
          notificationType: "like_group_post",
          postId: post._id.toString(),
          groupId: post.groupId.toString(),
          senderId: likerId.toString(),
        }
      );

      return notif;
    }

    // ===============================
    // NORMAL POST LIKE
    // ===============================
    await Notification.deleteMany({
      userId: postOwnerId,
      senderId: likerId,
      postId: post._id,
      type: "like",
    });

    const notif = await Notification.create({
      userId: postOwnerId,
      senderId: likerId,
      type: "like",
      message: `${liker.profileName} liked your post`,
      senderName: liker.profileName,
      senderImage: liker.profileImage,
      postId: post._id,
      postContent: post.content || null,
      media: mediaArray,
      isRead: false,
    });

    await sendPushNotification(
      postOwnerId,
      `${liker.profileName} liked your post ❤️`,
      post.content
        ? `${post.content.substring(0, 80)}${post.content.length > 80 ? "..." : ""}`
        : "Your post is getting attention on HloXpat.",
      {
        type: "like",
        notificationType: "like_post",
        postId: post._id.toString(),
        senderId: likerId.toString(),
      }
    );

    return notif;
  } catch (err) {
    console.log("❌ ERROR IN LIKE NOTIFICATION:", err);
  }
};

exports.createCommentNotification = async ({ post, comment, commenterId }) => {
  try {
    const commenter = await User.findById(commenterId)
      .select("profileName profileImage");

    if (!commenter) return;

    let mediaArray = [];

    if (Array.isArray(post.media)) {
      mediaArray = post.media;
    } else if (Array.isArray(post.image)) {
      mediaArray = post.image;
    } else if (post.image) {
      mediaArray = [post.image];
    }

    const postOwnerId = post.userId?._id || post.userId;

    // ===============================
    // GROUP POST COMMENT
    // ===============================
    if (post.groupId) {
      const group = await Group.findById(post.groupId)
        .select("name groupIcon")
        .lean();

      const notification = await Notification.create({
        userId: postOwnerId,
        senderId: commenterId,
        type: "group_post_comment",
        message: `${commenter.profileName} commented on your post in ${group?.name || "group"}`,
        senderName: commenter.profileName,
        senderImage: commenter.profileImage,
        commentId: comment._id,
        commentText: comment.text || null,
        parentCommentId: comment.parentId || null,
        postId: post._id,
        postContent: post.content || null,
        groupId: post.groupId,
        groupName: group?.name || null,
        groupLogo: group?.groupIcon || null,
        media: mediaArray,
        isRead: false
      });

      await sendPushNotification(
        postOwnerId,
        `${group?.name || "Group"} new comment on your post 💬`,
        comment.text && post.content
          ? `${commenter.profileName}: "${comment.text.substring(0, 45)}" on "${post.content.substring(0, 35)}"`
          : comment.text
          ? `${commenter.profileName}: "${comment.text.substring(0, 70)}"`
          : post.content
          ? `On "${post.content.substring(0, 55)}"`
          : `${commenter.profileName} commented on your post.`,
        {
          type: "group_post_comment",
          notificationType: "comment_group_post",
          postId: post._id.toString(),
          commentId: comment._id.toString(),
          groupId: post.groupId.toString(),
          senderId: commenterId.toString(),
          openComments: "1",
        }
      );

      return notification;
    }

    // ===============================
    // NORMAL POST COMMENT
    // ===============================
    const notification = await Notification.create({
      userId: postOwnerId,
      senderId: commenterId,
      type: "comment",
      message: `${commenter.profileName} commented on your post`,
      senderName: commenter.profileName,
      senderImage: commenter.profileImage,
      commentId: comment._id,
      commentText: comment.text || null,
      parentCommentId: comment.parentId || null,
      postId: post._id,
      postContent: post.content || null,
      media: mediaArray,
      isRead: false
    });

    await sendPushNotification(
      postOwnerId,
      `${commenter.profileName} commented on your post 💬`,
      comment.text && post.content
        ? `${comment.text.substring(0, 45)} on "${post.content.substring(0, 35)}"`
        : comment.text
        ? `${comment.text.substring(0, 70)}${comment.text.length > 70 ? "..." : ""}`
        : post.content
        ? `On "${post.content.substring(0, 55)}${post.content.length > 55 ? "..." : ""}"`
        : "Tap to view the discussion.",
      {
        type: "comment",
        notificationType: "comment_post",
        postId: post._id.toString(),
        commentId: comment._id.toString(),
        openComments: "1",
      }
    );

    return notification;

  } catch (error) {
    console.log("❌ COMMENT NOTIFICATION ERROR:", error.message);
  }
};

exports.createFollowNotification = async ({ userId, followerId }) => {
  await removeDuplicate({
    userId,
    senderId: followerId,
    type: "follow"
  });

  const follower = await User.findById(followerId)
    .select("profileName profileImage");

  const notif = await Notification.create({
    userId,
    senderId: followerId,
    type: "follow",
    message: "started following you",
    senderName: follower.profileName,
    senderImage: follower.profileImage
  });

  // 🔥 SEND PUSH
  await sendPushNotification(
    userId,
    `${follower.profileName} 👤`,
    `${follower.profileName} started following you`,
    {
      type: "follow",
      notificationType: "follow_user",
      senderId: followerId.toString()
    }
  );

  return notif;
};

exports.createGroupInviteNotification = async ({ sender, receiver, group, message }) => {

  await removeDuplicate({
    userId: receiver._id,
    senderId: sender._id,
    groupId: group._id,
    type: "group-invite"
  });

  const notif = await Notification.create({
    userId: receiver._id,
    senderId: sender._id,
    type: "group-invite",
    message: `invited you to be part of the community`,
    senderName: sender.profileName,
    senderImage: sender.profileImage,
    groupId: group._id,
    groupName: group.name,
    groupLogo: group.groupIcon,
    referenceId: message._id,
    status: "pending"
  });

  // 🔥 SEND PUSH
  await sendPushNotification(
    receiver._id,
    `${group.name} 🌍`,
    `${sender.profileName} invited you to be part of the community.`,
    {
      type: "group-invite",
      notificationType: "group_invite",
      groupId: group._id.toString(),
      senderId: sender._id.toString(),
    }
  );

  return notif;
};

exports.updateGroupMemberStatus = async (
  groupId,
  userId,
  status
) => {

  try {

    // ======================================
    // VALIDATE STATUS
    // ======================================
    if (
      !["approved", "rejected"]
        .includes(status)
    ) {

      throw new Error(
        "Invalid status"
      );

    }

    // ======================================
    // UPDATE GROUP MEMBER
    // ======================================
    const updatedMember =
      await GroupMember.findOneAndUpdate(

        {
          groupId,
          userId,
        },

        {
          status,
        },

        {
          new: true,
        }

      );

    console.log(
      "UPDATED MEMBER =>",
      updatedMember
    );

    if (!updatedMember) {

      console.log(
        "⚠️ Group member not found"
      );

      return null;

    }

    // ======================================
    // FETCH GROUP
    // ======================================
    const group =
      await Group.findById(groupId)
        .select("name groupIcon");

    const groupName =
      group?.name || "the group";

    // ======================================
    // PUSH MESSAGE
    // ======================================
    const pushMessage =
      status === "approved"

        ? `You have been added to ${groupName}!`

        : `Your request to join ${groupName} was rejected`;

    // ======================================
    // SEND PUSH
    // ======================================
    await sendPushNotification(

      userId,

      "Group Request Update",

      pushMessage,

      {

        type:
          "group-request-status",

        notificationType:
          status === "approved"

            ? "group_request_approved"

            : "group_request_rejected",

        groupId:
          groupId.toString(),

        status,

      }

    );

    return updatedMember;

  } catch (error) {

    console.log(
      "❌ UPDATE GROUP MEMBER ERROR:",
      error.message
    );

  }

};

exports.sendMessageNotification = async ({ sender, receiver, message, chat }) => {
  try {
    if (!sender || !receiver || !message) {
      console.log("❌ Missing data for sendMessageNotification");
      return;
    }

    // Fallbacks
    const senderName = sender.profileName || "Someone";
    const senderImage = sender.profileImage || null;

    // Notification message preview
    const previewText =
      message.messageType === "image"
        ? "📷 Photo"
        : message.messageType === "video"
          ? "🎥 Video"
          : message.messageType === "audio"
            ? "🎤 Audio Message"
            : trimText(message.text || "New message", 120);

    // Create Notification entry
    const notif = await Notification.create({
      userId: receiver._id,
      senderId: sender._id,
      senderName,
      senderImage,
      type: "chat-message",
      message: previewText,
      chatId: chat._id,
      referenceId: message._id,
      status: "unread",
    });

    // Prepare push title
    const pushTitle = `${senderName} sent you a message`;

    // Send FCM push
    await sendPushNotification(
      receiver._id,
      pushTitle,
      previewText,
      {
        type: "chat-message",
        notificationType: "chat_message",
        conversationId: chat._id.toString(),
        messageId: message._id.toString(),
        senderId: sender._id.toString()
      }
    );

    return notif;
  } catch (error) {
    console.log("❌ SEND MESSAGE NOTIFICATION ERROR:", error.message);
  }
};

exports.notifyGroupAdminsOnJoinRequest = async ({ requester, group, request }) => {
  try {
    if (!requester || !group || !request) {
      console.log("❌ Missing data for notifyGroupAdminsOnJoinRequest");
      return;
    }
    // ✔ Only send to the creator, not all admins
    const creatorId = group.createdBy;
    if (!creatorId) return;
    // Fetch creator details
    const creator = await User.findById(creatorId)
      .select("_id profileName profileImage deviceToken");
    if (!creator) return;
    const requesterName = requester.profileName || "Someone";
    // Save notification
    const notif = await Notification.create({
      userId: creator._id,
      senderId: requester._id,
      type: "group-join-request",
      message: `${requesterName} requested to join ${group.name}`,
      senderName: requesterName,
      senderImage: requester.profileImage,
      groupId: group._id,
      groupName: group.name,
      groupLogo: group.groupIcon,
      referenceId: request._id,
      status: "pending"
    });
    console.log("nnknkiuu")
    // Push Notification
    await sendPushNotification(
      creator._id,
      "Group Join Request 👥",
      `${requesterName} requested to join ${group.name}`,
      {
        type: "group-join-request",
        notificationType: "group_join_request",
        groupId: group._id.toString(),
        requestId: request._id.toString(),
        requesterId: requester._id.toString()
      }
    );

    return notif;
  } catch (err) {
    console.log(" GROUP JOIN REQUEST ERROR:", err.message);
  }
};

exports.createPostNotificationForFollowers = async ({ post }) => {
  try {
    const creator = await User.findById(post.userId)
      .select("profileName profileImage");

    if (!creator) return;

    const followers = await Follow.find({
      following: creator._id
    }).select("follower");

    if (!followers.length) return;

    const mediaArray = Array.isArray(post.media)
      ? post.media
      : post.media
        ? [post.media]
        : [];

    for (const item of followers) {
      const followerId = item.follower;

      if (followerId.toString() === creator._id.toString()) continue;

      await Notification.deleteMany({
        userId: followerId,
        senderId: creator._id,
        postId: post._id,
        type: "new_post",
      });

      await Notification.create({
        userId: followerId,
        senderId: creator._id,
        type: "new_post",
        message: 'shared a new post',
        senderName: creator.profileName,
        senderImage: creator.profileImage,
        postId: post._id,
        postContent: post.content || null,
        media: mediaArray,
        isRead: false,
      });

      await sendPushNotification(
        followerId,
        `${creator.profileName} shared a new post`,
        post.content
          ? `${post.content.substring(0, 90)}${post.content.length > 90 ? "..." : ""}`
          : "Tap to see the latest update on HloXpat.",
        {
          type: "new_post",
          notificationType: "new_post",
          postId: post._id.toString(),
        }
      );
    }

    return true;

  } catch (err) {
    console.log("ERROR IN POST FOLLOWER NOTIFICATION:", err);
  }
};

exports.createGroupPostNotification = async ({ post }) => {
  try {
    const creator = await User.findById(post.userId)
      .select("profileName profileImage");

    if (!creator) return;

    const group = await Group.findById(post.groupId)
      .select("name groupIcon")
      .lean();

    if (!group) return;

    const members = await GroupMember.find({
      groupId: post.groupId,
      status: "approved"
    }).select("userId");

    if (!members.length) return;

    const mediaArray = Array.isArray(post.media)
      ? post.media
      : post.media
        ? [post.media]
        : [];

    for (const item of members) {
      const memberId = item.userId;

      if (memberId.toString() === creator._id.toString()) continue;

      await Notification.deleteMany({
        userId: memberId,
        senderId: creator._id,
        postId: post._id,
        groupId: group._id,
        type: "group_post",
      });

      await Notification.create({
        userId: memberId,
        senderId: creator._id,
        type: "group_post",
        message: `${creator.profileName} shared a post in ${group.name}`,
        senderName: creator.profileName,
        senderImage: creator.profileImage,
        postId: post._id,
        postContent: post.content || null,
        groupId: group._id,
        groupName: group.name,
        groupLogo: group.groupIcon,
        media: mediaArray,
        isRead: false,
      });

      await sendPushNotification(
        memberId,
        `${group.name} 👥`,
        post.content
          ? `${creator.profileName} posted: "${post.content.substring(0, 60)}${post.content.length > 60 ? "..." : ""}"`
          : `${creator.profileName} shared a new post in the group.`,
        {
          type: "group_post",
          notificationType: "new_group_post",
          postId: post._id.toString(),
          groupId: group._id.toString(),
        }
      );
    }

    return true;

  } catch (error) {
    console.log("GROUP POST NOTIFICATION ERROR:", error);
  }
};

exports.createShareSuccessNotification = async ({ userId, post }) => {
  try {
    await Notification.create({
      userId,
      senderId: userId,
      type: "share_success",
      message: "Your post was shared successfully",
      postId: post?._id || null,
      postContent: post?.content || null,
      isRead: false,
    });

    await sendPushNotification(
      userId,
      "Shared ",
      "Your post was shared successfully",
      {
        type: "share_success",
        postId: post?._id ? post._id.toString() : "",
      }
    );

    return true;
  } catch (error) {
    console.log(" SHARE SUCCESS NOTIFICATION ERROR:", error.message);
  }
};

exports.createAnnouncementNotification = async ({ userIds, title, message, data = {} }) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    for (const uid of userIds) {
      await Notification.create({
        userId: uid,
        type: "announcement",
        message,
        isRead: false,
      });

      await sendPushNotification(
        uid,
        title || "Announcement",
        message,
        {
          type: "announcement",
          ...data,
        }
      );
    }
  } catch (error) {
    console.log(" ANNOUNCEMENT NOTIFICATION ERROR:", error.message);
  }
};
