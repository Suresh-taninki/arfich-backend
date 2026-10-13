const Group = require("../../models/group/group");
const GroupMember=require("../../models/group/groupMembers")
const Post =require("../../models/userPosts/Post")
const Like =require("../../models/userPosts/like")
const Comment =require("../../models/userPosts/comments")
const Share =require("../../models/userPosts/share") 
const User =require("../../models/user")
const Notification=require("../../models/notifications");
const { createGroupInviteNotification, notifyGroupAdminsOnJoinRequest, updateGroupInviteNotificationStatus, updateGroupMemberStatus } = require("../../middleware/notification");
// const Follower=require("../../models/")
const formatTimeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  if (seconds < 60) return "Just now";

  for (let key in intervals) {
    const interval = Math.floor(seconds / intervals[key]);
    if (interval >= 1) {
      if (key === "minute") return `${interval}m`;
      if (key === "hour") return `${interval}h`;
      if (key === "day") return `${interval}d`;
      if (key === "week") return `${interval}w`;
      if (key === "month") return `${interval}mo`;
      if (key === "year") return `${interval}y`;
    }
  }
};
// Create Community
exports.addGroup=async (req, res) => {
  try {
    const { name, description, groupBanner, groupIcon,country,state, rules, isPrivate,userId } = req.body;
    const existingGroup = await Group.findOne({ name });

    if (existingGroup) {
      return res.status(200).json({ responseCode:400, message: "Group name already exists." });
    }
    const group = new Group({
      name,
      description,
      groupBanner,
      groupIcon,
      createdBy: userId,
      admins: userId,
      members: [userId],
      rules,
      state,country,
      isPrivate,
    });

    await group.save();
    
    res.status(200).json({responseCode:200,message:"Group Created Successfully.",_id:group._id});
  } catch (error) {
    res.status(500).json({ message: "Error creating group", error });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, groupIcon, groupBanner, description, isPrivate } = req.body;

    // 🔍 Check group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 🛑 OPTIONAL: only creator/admin can update
    // if (!group.admins.includes(req.user.id)) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    // 🧠 Update only provided fields
    if (name !== undefined) group.name = name;
    if (groupIcon !== undefined) group.groupIcon = groupIcon;
    if (groupBanner !== undefined) group.groupBanner = groupBanner;
    if (description !== undefined) group.description = description;
    if (isPrivate !== undefined) group.isPrivate = isPrivate;

    await group.save();

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: group,
    });
  } catch (error) {
    console.error("UPDATE GROUP ERROR:", error);

    // ⚠️ Handle duplicate group name
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Group name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get All Communities
exports.getAllGroup = async (req, res) => {
  try {
    const { userId } = req.params; // logged-in user ID received from frontend

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }
    // 1️⃣ Groups created by this user
    const myGroups = await Group.find({ createdBy: userId })
      .populate("createdBy", "username profileImage") // optional
      .sort({ createdAt: -1 });

    // 2️⃣ Groups user has joined (but not created)
    const joinedGroups = await Group.find({
  _id: {
    $in: await GroupMember.find({
      userId,
      status: "approved"
    }).distinct("groupId")
  },
  createdBy: { $ne: userId }
})
  .populate("createdBy", "username profileImage")
  .sort({ createdAt: -1 });


    res.status(200).json({
      success: true,
      myGroups,
      joinedGroups
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching groups",
      error
    });
  }
};

exports.getGroupSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId required",
      });
    }

    const groups = await Group.find()
      .select("name description groupBanner country groupIcon createdBy")
      .sort({ createdAt: -1 })
      .lean();

    const formattedGroups = await Promise.all(
      groups.map(async (g) => {

        // 🔥 STEP 1: Get approved members
        const approvedMembers = await GroupMember.find({
          groupId: g._id,
          status: "approved",
        })
          .select("userId")
          .lean();

        // 🔥 STEP 2: Create unique member set
        const memberSet = new Set(
          approvedMembers.map(m => m.userId.toString())
        );

        // 🔥 STEP 3: Add admin (createdBy)
        const adminId = g.createdBy?.toString();
        if (adminId) {
          memberSet.add(adminId);
        }

        const memberCount = memberSet.size;

        // 🔥 STEP 4: Get last 3 approved member images
        const lastMembers = await GroupMember.find({
          groupId: g._id,
          status: "approved",
        })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("userId", "profileImage")
          .lean();

        const people = lastMembers.map(
          (m) => m.userId?.profileImage || ""
        );

        // 🔥 STEP 5: Check admin
        const isAdmin = adminId === userId;

        // 🔥 STEP 6: Check membership
        const userMembership = await GroupMember.findOne({
          groupId: g._id,
          userId,
        }).lean();

        let joinStatus = "none";
        let isJoined = false;

        if (isAdmin) {
          joinStatus = "approved";
          isJoined = true;
        } else if (userMembership) {
          if (userMembership.status === "approved") {
            joinStatus = "approved";
            isJoined = true;
          } else if (userMembership.status === "pending") {
            joinStatus = "pending";
          }
        }

        return {
          id: g._id,
          title: g.name,
          sub: g.description || "",
          banner: g.groupBanner || "",
          people,
          country:g.country,
          logo:g.groupIcon,
          count: memberCount,
          isJoined,
          joinStatus,
          isAdmin,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: formattedGroups.length,
      groups: formattedGroups,
    });

  } catch (error) {
    console.error("Get Group Suggestions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching group suggestions",
    });
  }
};

exports.getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate("createdBy", "name profileImage")

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error("GET GROUP ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.getByGroup = async (req, res) => {
  
  console.log("dgmggegkepgkegekg")
  try {
    const { groupId } = req.params;
    const { userId } = req.query;

    const group = await Group.findById(groupId)
      .select("name description groupBanner groupIcon country isPrivate createdBy")
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 🔥 STEP 1: Get approved members
    const approvedMembers = await GroupMember.find({
      groupId,
      status: "approved",
    })
      .select("userId")
      .lean();

    // 🔥 STEP 2: Create unique member set
    const memberSet = new Set(
      approvedMembers.map(m => m.userId.toString())
    );

    // 🔥 STEP 3: Add admin (createdBy)
    const adminId = group.createdBy?.toString();
    if (adminId) {
      memberSet.add(adminId);
    }

    const memberCount = memberSet.size;

    // 🔥 STEP 4: Check admin
    const isAdmin = adminId === userId;

    // 🔥 STEP 5: Check membership (only if not admin)
    const userMembership = await GroupMember.findOne({
      groupId,
      userId,
    }).lean();

    let joinStatus = "none";
    let isJoined = false;

    if (isAdmin) {
      joinStatus = "approved";
      isJoined = true;
    } else if (userMembership) {
      if (userMembership.status === "approved") {
        joinStatus = "approved";
        isJoined = true;
      } else if (userMembership.status === "pending") {
        joinStatus = "pending";
      }
    }

    // 🔥 STEP 6: Fetch posts
    const posts = await Post.find({ groupId })
      .sort({ createdAt: -1 })
      .lean();

    const postIds = posts.map(p => p._id);
    const postUserIds = posts.map(p => p.userId);

    const [likeCounts, commentCounts, shareCounts] = await Promise.all([
      Like.aggregate([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: "$postId", count: { $sum: 1 } } }
      ]),
      Comment.aggregate([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: "$postId", count: { $sum: 1 } } }
      ]),
      Share.aggregate([
        { $match: { postId: { $in: postIds } } },
        { $group: { _id: "$postId", count: { $sum: 1 } } }
      ])
    ]);

    const likeMap = Object.fromEntries(
      likeCounts.map(i => [i._id.toString(), i.count])
    );

    const commentMap = Object.fromEntries(
      commentCounts.map(i => [i._id.toString(), i.count])
    );

    const shareMap = Object.fromEntries(
      shareCounts.map(i => [i._id.toString(), i.count])
    );

    const likedPosts = await Like.find({
      userId,
      postId: { $in: postIds }
    }).select("postId");

    const likedIds = new Set(
      likedPosts.map(l => l.postId.toString())
    );

    const users = await User.find({
      _id: { $in: postUserIds }
    })
      .select("profileName profileImage")
      .lean();

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          id: u._id,
          name: u.profileName,
          image: u.profileImage,
        }
      ])
    );

    const formattedPosts = posts.map(p => ({
      _id: p._id,
      content: p.content,
      media: p.media,
      timeAgo: formatTimeAgo(p.createdAt),

      type: "group",
      source: {
        id: groupId,
        name: group.name,
        image: group.groupIcon,

      },

      joinStatus,
      isJoined,
      isAdmin,
      user: userMap[p.userId] || {},

      likeCount: likeMap[p._id.toString()] || 0,
      commentCount: commentMap[p._id.toString()] || 0,
      shareCount: shareMap[p._id.toString()] || 0,

      isLiked: likedIds.has(p._id.toString()),
      isOwner: p.userId.toString() === userId,
    }));

    return res.status(200).json({
      success: true,
      group: {
        id: groupId,
        name: group.name,
        description: group.description,
        bannerImage: group.groupBanner,
        image: group.groupIcon,
        country: group.country,
        isPrivate:group.isPrivate,
        memberCount,
        joinStatus,
        isJoined,
        isAdmin,
      },
      posts: formattedPosts,
    });

  } catch (error) {
    console.error("Get Group Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching group",
    });
  }
};


exports.groupJoin = async (req, res) => {
  try {
    const { groupId, userId } = req.body;

    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing groupId or userId"
      });
    }

    // Get group including privacy
    const group = await Group.findById(groupId)
      .select("name groupIcon createdBy admins isPrivate");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found"
      });
    }

    const existing = await GroupMember.findOne({ groupId, userId });

    const io = req.app.get("io");

    /* ==============================
       USER ALREADY MEMBER → LEAVE
    ============================== */

    if (existing && existing.status === "approved") {
      await GroupMember.deleteOne({ _id: existing._id });

      if (io) {
        const memberCount = await GroupMember.countDocuments({ groupId });
        io.to(userId).emit("groupJoinUpdated", {
          groupId,
          userId,
          joined: false,
          status: "left",
          createdAt: new Date().toISOString(),
        });

        io.to(String(groupId)).emit("groupMemberCountUpdated", {
          groupId: String(groupId),
          memberCount,
          createdAt: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        joined: false,
        status: "left",
        message: "Left group successfully"
      });
    }

    /* ==============================
       REQUEST ALREADY SENT
    ============================== */

    if (existing && existing.status === "pending") {
      return res.status(200).json({
        success: true,
        joined: false,
        status: "pending",
        message: "Join request already sent"
      });
    }

    /* ==============================
       PUBLIC GROUP → AUTO APPROVE
    ============================== */
    console.log(group.isPrivate)
console.log(group.isPrivate ===false)
    if (group.isPrivate === false) {
console.log("inside")
      await GroupMember.create({
        groupId,
        userId,
        status: "approved"
      });

      if (io) {
        const memberCount = await GroupMember.countDocuments({ groupId });
        io.to(userId).emit("groupJoinUpdated", {
          groupId,
          userId,
          joined: true,
          status: "approved",
          createdAt: new Date().toISOString(),
        });

        io.to(groupId).emit("groupMemberJoined", {
          groupId,
          userId,
          status: "approved",
          createdAt: new Date().toISOString(),
        });

        io.to(String(groupId)).emit("groupMemberCountUpdated", {
          groupId: String(groupId),
          memberCount,
          createdAt: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        joined: true,
        status: "approved",
        message: "Joined group successfully"
      });
    }
    /* ==============================
       PRIVATE GROUP → SEND REQUEST
    ============================== */
    const request = await GroupMember.create({
      groupId,
      userId,
      status: "pending"
    });
    const requester = await User.findById(userId)
      .select("profileName profileImage");
    const notif = await notifyGroupAdminsOnJoinRequest({
      requester,
      group,
      request
    });

    if (io) {
      io.to(userId).emit("groupJoinUpdated", {
        groupId,
        userId,
        joined: false,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      if (group.createdBy) {
        io.to(String(group.createdBy)).emit("notificationCreated", {
          notification: notif,
        });
      }
    }

    return res.status(200).json({
      success: true,
      joined: false,
      status: "pending",
      message: "Join request sent to group admin"
    });

  } catch (error) {
    console.error("Group Join Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error joining group",
      error: error.message
    });
  }
};


exports.communityleave=async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    
    if (!community) return res.status(404).json({ message: "Community not found" });

    community.members = community.members.filter(member => member.toString() !== req.user._id.toString());
    await community.save();

    res.status(200).json({ message: "Left community successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error leaving community", error });
  }
}

exports.groupDelete = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(200).json({ responseCode:400, message: "Group not found" });
    }
    // 1️⃣ Delete all group posts
    await Post.deleteMany({ groupId });
    // 2️⃣ Delete all group members
    await GroupMember.deleteMany({ groupId });
    // 3️⃣ Delete group 
    await Group.findByIdAndDelete(groupId);
    res.status(200).json({
      success: true,
      message: "Group, posts, and members deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error deleting group",
      error
    });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json({ message: "Invalid groupId" });
    }

    /* ================= GET GROUP & ADMINS ================= */
    const group = await Group.findById(groupId)
      .populate("admins", "firstName profileName profileImage")
      .lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const admins = (group.admins || []).map((admin) => ({
      _id: admin._id,
      firstName: admin.firstName,
      profileName: admin.profileName,
      profileImage: admin.profileImage,
      role: "admin",
      isAdmin: true,
      status: "completed",
    }));

    const adminIds = admins.map((a) => a._id.toString());

    /* ================= GET COMPLETED MEMBERS ================= */
    const membersData = await GroupMember.find({
      groupId,
      status: "approved", // ✅ IMPORTANT
    })
      .populate("userId", "firstName profileName profileImage")
      .lean();

    const members = membersData
      .filter(
        (m) =>
          m.userId &&
          !adminIds.includes(m.userId._id.toString())
      )
      .map((m) => ({
        _id: m._id,
        firstName: m.userId.firstName,
        profileName: m.userId.profileName,
        profileImage: m.userId.profileImage,
        role: m.role || "member",
        isAdmin: false,
        status: m.status,
      }));

    /* ================= RESPONSE ================= */
    return res.status(200).json({
      success: true,
      groupId,
      counts: {
        admins: admins.length,
        members: members.length,
        total: admins.length + members.length,
      },
      admins,
      members,
    });
  } catch (error) {
    console.error("GET GROUP MEMBERS ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getGroupPosts = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query; // logged-in user
  console.log(groupId,userId)

    /* ---------- VALIDATION ---------- */
    if (!(groupId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupId",
      });
    }

    if (userId && !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    /* ---------- FETCH GROUP ---------- */
    const group = await Group.findById(groupId)
      .select("name description groupBanner groupIcon admins members createdBy")
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    /* ---------- MEMBERS INFO ---------- */
    const memberCount = await GroupMember.countDocuments({ groupId });
    const isJoined = userId
      ? await GroupMember.exists({ groupId, userId })
      : false;

    const isAdmin = userId
      ? group.admins.some(id => id.toString() === userId)
      : false;

    /* ---------- FETCH POSTS ---------- */
    const posts = await Post.find({ groupId })
      .sort({ createdAt: -1 })
      .lean();

    const postIds = posts.map(p => p._id);
    const postUserIds = posts.map(p => p.userId);

    /* ---------- COMMENTS COUNT ---------- */
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]);

    const commentMap = Object.fromEntries(
      commentCounts.map(c => [c._id.toString(), c.count])
    );

    /* ---------- USERS MAP ---------- */
    const users = await User.find({ _id: { $in: postUserIds } })
      .select("profileName profileImage")
      .lean();

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          id: u._id,
          name: u.profileName,
          image: u.profileImage,
        },
      ])
    );

    /* ---------- FORMAT POSTS ---------- */
    const formattedPosts = posts.map(p => ({
      _id: p._id,
      content: p.text,
      media: p.media || [],
      type: "group",

      user: userMap[p.userId?.toString()] || {},

      source: {
        id: group._id,
        name: group.name,
        image: group.groupIcon || "",
      },

      likeCount: p.likes?.length || 0,
      commentCount: commentMap[p._id.toString()] || 0,
      shareCount: 0,

      isLiked: userId
        ? p.likes?.some(id => id.toString() === userId)
        : false,

      isJoined: Boolean(isJoined),
      isOwner: userId
        ? p.userId.toString() === userId
        : false,

      timeAgo: formatTimeAgo(p.createdAt),
    }));

    /* ---------- FINAL RESPONSE ---------- */
    return res.status(200).json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        bannerImage: group.groupBanner,
        image: group.groupIcon,
        memberCount,
        isJoined: Boolean(isJoined),
        isAdmin: Boolean(isAdmin),
      },
      posts: formattedPosts,
    });

  } catch (error) {
    console.error("GET GROUP POSTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching group posts",
    });
  }
};
// GET /user/group/requests/:groupId
exports.getGroupRequests = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    if (!groupId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid groupId or userId",
      });
    }

    /* ================= CHECK GROUP ================= */
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    /* ================= CHECK ADMIN ================= */
    const isAdmin = group.admins.some(
      (id) => id.toString() === userId.toString()
    );

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can view join requests",
      });
    }

    /* ================= ADMIN IDS ================= */
    const adminIds = group.admins.map((id) => id.toString());

    /* ================= GET PENDING REQUESTS ================= */
    const requests = await GroupMember.find({
      groupId,
      status: "pending",
    })
      .populate("userId", "firstName profileName profileImage")
      .lean();

    /* ================= FORMAT & REMOVE ADMINS ================= */
    const formattedRequests = requests
      .filter(
        (r) =>
          r.userId &&
          !adminIds.includes(r.userId._id.toString()) // ✅ remove admins
      )
      .map((r) => ({
        requestId: r._id,
        userId: r.userId._id,
        firstName: r.userId.firstName,
        profileName: r.userId.profileName,
        profileImage: r.userId.profileImage,
        requestedAt: r.createdAt,
      }));

    return res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("GET GROUP REQUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// POST /user/group/request/action
exports.handleGroupRequest = async (req, res) => {
  try {
    const { requestId, action,userId } = req.body;
    console.log("rgkgggg",requestId,action)

    if (!requestId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing requestId or action",
      });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action",
      });
    }
    /* ================= FIND REQUEST ================= */
const request = await GroupMember.findOne({
  _id: requestId,
});
    console.log(request)
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Join request not found",
      });
    }
    /* ================= CHECK GROUP & ADMIN ================= */
    const group = await Group.findById(request.groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const io = req.app.get("io");

    // const isAdmin = group.admins.some(
    //   (id) => id.toString() === userId.toString()
    // );

    // if (!isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Only admins can handle requests",
    //   });
    // }

    /* ================= HANDLE ACTION ================= */
    if (action === "approve") {
      request.status = "approved";
      await request.save();
      

      const updatedNotif = await updateGroupMemberStatus(    request.groupId,request.userId,"approved");

      const memberCount = await GroupMember.countDocuments({ groupId: request.groupId });
      if (io) {
        io.to(String(request.userId)).emit("groupJoinUpdated", {
          groupId: String(request.groupId),
          userId: String(request.userId),
          joined: true,
          status: "approved",
          createdAt: new Date().toISOString(),
        });

        io.to(String(request.groupId)).emit("groupMemberCountUpdated", {
          groupId: String(request.groupId),
          memberCount,
          createdAt: new Date().toISOString(),
        });

        if (updatedNotif) {
          io.to(String(updatedNotif.userId)).emit("notificationUpdated", {
            notification: updatedNotif,
          });
          io.to(String(updatedNotif.senderId)).emit("notificationUpdated", {
            notification: updatedNotif,
          });
          io.to(String(updatedNotif.senderId)).emit("groupInviteStatusUpdated", {
            groupId: String(updatedNotif.groupId),
            status: updatedNotif.status,
            type: updatedNotif.type,
            referenceId: updatedNotif.referenceId?.toString(),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    if (action === "reject") {

      const updatedNotif = await updateGroupMemberStatus(    request.groupId,

    request.userId,

    "rejected"
);
      await GroupMember.findByIdAndDelete(requestId);


      const memberCount = await GroupMember.countDocuments({ groupId: request.groupId });
      if (io) {
        io.to(String(request.userId)).emit("groupJoinUpdated", {
          groupId: String(request.groupId),
          userId: String(request.userId),
          joined: false,
          status: "rejected",
          createdAt: new Date().toISOString(),
        });

        io.to(String(request.groupId)).emit("groupMemberCountUpdated", {
          groupId: String(request.groupId),
          memberCount,
          createdAt: new Date().toISOString(),
        });

        if (updatedNotif) {
          io.to(String(updatedNotif.userId)).emit("notificationUpdated", {
            notification: updatedNotif,
          });
          io.to(String(updatedNotif.senderId)).emit("notificationUpdated", {
            notification: updatedNotif,
          });
          io.to(String(updatedNotif.senderId)).emit("groupInviteStatusUpdated", {
            groupId: String(updatedNotif.groupId),
            status: updatedNotif.status,
            type: updatedNotif.type,
            referenceId: updatedNotif.referenceId?.toString(),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    return res.status(200).json({
      success: true,
      message:
        action === "approve"
          ? "Request approved successfully"
          : "Request rejected successfully",
    });
  } catch (error) {
    console.error("HANDLE GROUP REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// GET /user/group/invite-users/:groupId
exports.getInviteUsers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.query;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "groupId is required",
      });
    }

    // 1️⃣ Get all members of the group (approved or pending)
    const groupMembers = await GroupMember.find({ groupId })
      .select("userId")
      .lean();

    const existingMemberIds = groupMembers.map(m => m.userId.toString());

    // 2️⃣ Fetch users except current user AND not in group
    const users = await User.find({
      _id: { 
        $nin: [...existingMemberIds, userId]   // exclude group members + logged user
      }
    })
      .select("firstName profileName profileImage profession currentCountry nativeCountry")
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });

  } catch (err) {
    console.log("Invite Users Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.sendInvite = async (req, res) => {
  try {
    const { sender, toUserId, groupId } = req.body;

    if (!sender || !toUserId || !groupId) {
      return res.status(400).json({
        success: false,
        message: "Missing sender, receiver or groupId"
      });
    }

    // Fetch sender, receiver, group
    const senderUser = await User.findById(sender).select("profileName profileImage");
    const receiverUser = await User.findById(toUserId).select("deviceToken profileName");
    const group = await Group.findById(groupId).select("name groupIcon");

    if (!senderUser || !receiverUser || !group) {
      return res.status(404).json({
        success: false,
        message: "User or group not found"
      });
    }

    // Create invite record
    const inviteRecord = await GroupInvite.create({
      sender,
      receiver: toUserId,
      groupId,
    });

    // Create message for chat invite (if needed)
    const chatMessage = await Message.create({
      senderId: senderUser._id,
      receiverId: receiverUser._id,
      messageType: "group-invite",
      text: `${senderUser.profileName} invited you to join ${group.name}`,
      groupId,
      actionStatus: "pending"
    });

    // Send notification + push 
    const notif = await createGroupInviteNotification({
      sender: senderUser,
      receiver: receiverUser,
      group,
      message: chatMessage
    });

    const io = req.app.get("io");
    if (io && notif) {
      io.to(String(toUserId)).emit("notificationCreated", {
        notification: notif,
      });

      io.to(String(toUserId)).emit("groupInviteCreated", {
        groupId: String(groupId),
        inviteId: inviteRecord._id?.toString(),
        notificationId: notif._id?.toString(),
        status: notif.status,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: "Invite sent successfully",
      inviteId: inviteRecord._id
    });

  } catch (err) {
    console.error("SEND INVITE ERROR:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

