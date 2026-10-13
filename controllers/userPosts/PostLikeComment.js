const Post = require("../../models/userPosts/Post");
const Like = require("../../models/userPosts/like"); // Import Like model
const Share = require("../../models/userPosts/share"); // Import Like model
const Comment = require("../../models/userPosts/comments"); // Import Like model
const User = require("../../models/user")
const Follower = require("../../models/followingfollowers/followersandfollowing")
const CommunityMember = require("../../models/community/communityMembers")
const GroupMember = require("../../models/group/groupMembers")
const Community = require("../../models/community/community")
const Group = require("../../models/group/group")
const SavedPost = require("../../models/savedPost");
const { awardPoints } = require("../hxp");
const RULES = require("../../config");
const { createLikeNotification, createCommentNotification, createPostNotificationForFollowers, createGroupPostNotification, createReplyNotification, createShareSuccessNotification, replyCommentOwnerNotification, replyGroupCommentNotification, replyPostOwnerNotification } = require("../../middleware/notification");
const { sendWebhook } = require("../../middleware/webhook");

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

// ✅ Create Post
exports.createPost = async (req, res) => {
  try {
    const { userId, content, media, communityId, groupId, privacy } = req.body;

    if (!userId || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "userId & content are required",
      });
    }

    // =========================
    // CREATE POST
    // =========================
    let post = new Post({
      userId,
      content,
      media: Array.isArray(media) ? media : media ? [media] : [],
      communityId,
      groupId,
      privacy,
    });

    await post.save();

    // Slug
    const slug = `${post._id.toString().slice(-6)}-${Date.now().toString(36)}`;
    post.slug = slug;
    await post.save();

    // =========================
    // COUNTS + USER DETAILS
    // =========================
    const user = await User.findById(userId)
      .select("profileName profileImage")
      .lean();

    const followersCount = await Follower.countDocuments({
      following: userId,
    });

    // =========================
    // TYPE + SOURCE
    // =========================
    let type = "user";
    let source = {
      userId: user._id,
      name: user.profileName,
      image: user.profileImage || "",
      followersCount,
    };

    let joinStatus = "none";

    // COMMUNITY POST
    if (communityId) {
      const community = await Community.findById(communityId)
        .select("name bannerImage")
        .lean();

      type = "community";

      source = {
        id: community?._id,
        name: community?.name || "",
        image: community?.bannerImage || "",
      };

      const isJoined = await CommunityMember.findOne({
        userId,
        communityId,
      });

      joinStatus = isJoined ? "approved" : "none";
    }

    // GROUP POST
    if (groupId) {
      const group = await Group.findById(groupId)
        .select("name groupIcon")
        .lean();

      type = "group";

      source = {
        id: group?._id,
        name: group?.name || "",
        image: group?.groupIcon || "",
      };

      const groupMember = await GroupMember.findOne({
        userId,
        groupId,
      });

      joinStatus = groupMember?.status || "none";
    }

    // =========================
    // FINAL SAME AS getPosts
    // =========================
    const postResponse = {
      _id: post._id,
      content: post.content,
      privacy: post.privacy,
      media: post.media || [],
      link: post.slug,
      timeAgo: "Just now",

      type,
      source,
      joinStatus,

      user: {
        userId: user._id,
        name: user.profileName,
        image: user.profileImage || "",
        followersCount,
      },

      communityId: communityId || null,
      groupId: groupId || null,

      likeCount: 0,
      shareCount: 0,
      commentCount: 0,

      isCommunityPost: !!communityId,
      isGroupPost: !!groupId,

      isLiked: false,
      isOwner: true,
      isFollowed: false,
      isSaved: false,
    };

    // =========================
    // NOTIFICATIONS
    // =========================
    if (groupId) {
      await createGroupPostNotification({ post });
    } else {
      await createPostNotificationForFollowers({ post });
    }

    await awardPoints({
      userId,
      type: "POST_CREATE",
      sourceId: post._id,
      points: RULES.POST_CREATE,
    });

    // =========================
    // SOCKET
    // =========================
    const io = req.app.get("io");

    if (io) {
      io.emit("postCreated", postResponse);

    }

    // =========================
    // RESPONSE
    // =========================
    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: postResponse,
    });

  } catch (error) {
    console.error("Create Post Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};
exports.getMyMediaPosts = async (req, res) => {
  try {
    const userId = req._id.params;

    const posts = await Post.find({
      userId,
      media: { $exists: true, $ne: [] } // only posts with images
    })
      .sort({ createdAt: -1 })
      .select("media createdAt");

    // Flatten media images
    const mediaList = posts.flatMap(post =>
      post.media.map(img => ({
        image: img,
        postId: post._id,
        createdAt: post.createdAt,
      }))
    );

    res.status(200).json({
      success: true,
      userId,
      totalImages: mediaList.length,
      media: mediaList,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ Get All Posts (Paginated)
// exports.getPosts = async (req, res) => {
//   try {
//     const { page, limit, userId } = req.query;

//     // FETCH POSTS
//     const posts = await Post.find()
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     const postIds = posts.map(p => p._id);
//     const userIds = posts.map(p => p.userId);
//     const communityIds = posts.filter(p => p.communityId).map(p => p.communityId);
//     const groupIds = posts.filter(p => p.groupId).map(p => p.groupId);

//     // LIKE COUNTS
//     const likeCounts = await Like.aggregate([
//       { $match: { postId: { $in: postIds } } },
//       { $group: { _id: "$postId", count: { $sum: 1 } } }
//     ]);

//     // SHARE COUNTS
//     const shareCounts = await Share.aggregate([
//       { $match: { postId: { $in: postIds } } },
//       { $group: { _id: "$postId", count: { $sum: 1 } } }
//     ]);

//     // COMMENT COUNTS
//     const commentCounts = await Comment.aggregate([
//       { $match: { postId: { $in: postIds } } },
//       { $group: { _id: "$postId", count: { $sum: 1 } } }
//     ]);

//     // FOLLOWERS COUNT
//     const followerCounts = await Follower.aggregate([
//       { $match: { following: { $in: userIds } } },
//       { $group: { _id: "$following", count: { $sum: 1 } } }
//     ]);

//     // USER FOLLOWING LIST
//     const followingDocs = await Follower.find({ follower: userId }).lean();
//     const followingIds = new Set(followingDocs.map(d => d.following.toString()));

//     // USER LIKED POSTS
//     const userLikes = await Like.find({ postId: { $in: postIds }, userId }).select("postId");
//     const likedPostIds = new Set(userLikes.map(l => l.postId.toString()));

//     // ⭐ ADDED: USER SAVED POSTS
//     const savedDocs = await SavedPost.find({ userId, postId: { $in: postIds } })
//       .select("postId");
//     const savedPostIds = new Set(savedDocs.map(s => s.postId.toString()));
//     // ⭐ END

//     // COMMUNITY JOIN STATUS
//     const joinedCommunities = await CommunityMember.find({ userId }).select("communityId");
//     const joinedCommunityIds = new Set(joinedCommunities.map(i => i.communityId.toString()));

//     // GROUP JOIN STATUS (pending/approved/rejected)
//     const groupMemberships = await GroupMember.find({ userId }).select("groupId status");

//     const approvedGroupIds = new Set(
//       groupMemberships.filter(g => g.status === "approved").map(g => g.groupId.toString())
//     );

//     const pendingGroupIds = new Set(
//       groupMemberships.filter(g => g.status === "pending").map(g => g.groupId.toString())
//     );

//     const rejectedGroupIds = new Set(
//       groupMemberships.filter(g => g.status === "rejected").map(g => g.groupId.toString())
//     );

//     // FETCH USER / COMMUNITY / GROUP DETAILS
//     const users = await User.find({ _id: { $in: userIds } })
//       .select("profileName profileImage");

//     const communities = await Community.find({ _id: { $in: communityIds } })
//       .select("name communityIcon bannerImage");

//     const groups = await Group.find({ _id: { $in: groupIds } })
//       .select("name groupIcon");

//     // MAPS
//     const likeMap = Object.fromEntries(likeCounts.map(i => [i._id.toString(), i.count]));
//     const shareMap = Object.fromEntries(shareCounts.map(i => [i._id.toString(), i.count]));
//     const commentMap = Object.fromEntries(commentCounts.map(i => [i._id.toString(), i.count]));
//     const followerMap = Object.fromEntries(followerCounts.map(i => [i._id.toString(), i.count]));

//     const userMap = Object.fromEntries(
//       users.map(u => [
//         u._id.toString(),
//         {
//           userId: u._id,
//           name: u.profileName,
//           image: u.profileImage || "",
//           followersCount: followerMap[u._id.toString()] || 0
//         }
//       ])
//     );

//     const communityMap = Object.fromEntries(
//       communities.map(c => [
//         c._id.toString(),
//         { id: c._id, name: c.name, image: c.bannerImage }
//       ])
//     );

//     const groupMap = Object.fromEntries(
//       groups.map(g => [
//         g._id.toString(),
//         { id: g._id, name: g.name, image: g.groupIcon }
//       ])
//     );

//     // FINAL RESPONSE DATA
//     const postsWithStats = posts.map(post => {
//       const postIdStr = post._id.toString();
//       const userIdStr = post.userId.toString();

//       const isLiked = likedPostIds.has(postIdStr);
//       const isOwner = userIdStr === userId.toString();
//       const isFollowed = followingIds.has(userIdStr);
//       const isSaved = savedPostIds.has(postIdStr); // ⭐ ADDED HERE

//       let type = "user";
//       let source = userMap[userIdStr];
//       let joinStatus = "none";

//       // COMMUNITY POST
//       if (post.communityId) {
//         const cid = post.communityId.toString();
//         type = "community";
//         source = communityMap[cid] || null;

//         joinStatus = joinedCommunityIds.has(cid) ? "approved" : "none";
//       }

//       // GROUP POST
//       if (post.groupId) {
//         const gid = post.groupId.toString();
//         type = "group";
//         source = groupMap[gid] || null;

//         if (approvedGroupIds.has(gid)) joinStatus = "approved";
//         else if (pendingGroupIds.has(gid)) joinStatus = "pending";
//         else if (rejectedGroupIds.has(gid)) joinStatus = "rejected";
//         else joinStatus = "none";
//       }

//       return {
//         _id: post._id,
//         content: post.content,
//         privacy: post.privacy,
//         media: post.media,
//         link: post.slug,
//         timeAgo: formatTimeAgo(post.createdAt),

//         type,
//         source,
//         joinStatus,

//         user: userMap[userIdStr] || {
//           userId: post.userId,
//           name: "",
//           image: "",
//           followersCount: followerMap[userIdStr] || 0
//         },

//         communityId: post.communityId || null,
//         groupId: post.groupId || null,

//         likeCount: likeMap[postIdStr] || 0,
//         shareCount: shareMap[postIdStr] || 0,
//         commentCount: commentMap[postIdStr] || 0,

//         isCommunityPost: !!post.communityId,
//         isGroupPost: !!post.groupId,
//         isLiked,
//         isOwner,
//         isFollowed,
//         isSaved   // ⭐ FINAL LINE
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       posts: postsWithStats,
//       page: Number(page),
//       limit: Number(limit)
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching posts"
//     });
//   }
// };


exports.getPosts = async (req, res) => {
  try {
    const { page, limit, userId } = req.query;

    const skip = (page - 1) * limit;

    // FETCH POSTS
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const postIds = posts.map(p => p._id);
    const userIds = posts.map(p => p.userId);
    const communityIds = posts.filter(p => p.communityId).map(p => p.communityId);
    const groupIds = posts.filter(p => p.groupId).map(p => p.groupId);

    // FOLLOWING LIST (needed for privacy)
    const followingDocs = await Follower.find({ follower: userId }).lean();
    const followingIds = new Set(followingDocs.map(d => d.following.toString()));

    // 🔥 PRIVACY FILTERING
    const filteredPosts = posts.filter(post => {
      const postOwnerId = post.userId.toString();
      const viewerId = userId?.toString();

      if (post.privacy === "Public") return true;

      if (post.privacy === "Private") {
        return postOwnerId === viewerId;
      }
      return false;
    });
    const filteredPostIds = filteredPosts.map(p => p._id);
    // LIKE COUNTS
    const likeCounts = await Like.aggregate([
      { $match: { postId: { $in: filteredPostIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    // SHARE COUNTS
    const shareCounts = await Share.aggregate([
      { $match: { postId: { $in: filteredPostIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    // COMMENT COUNTS
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: filteredPostIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    // FOLLOWERS COUNT
    const followerCounts = await Follower.aggregate([
      { $match: { following: { $in: userIds } } },
      { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);

    // USER LIKES
    const userLikes = await Like.find({
      postId: { $in: filteredPostIds },
      userId
    }).select("postId");

    const likedPostIds = new Set(userLikes.map(l => l.postId.toString()));

    // SAVED POSTS
    const savedDocs = await SavedPost.find({
      userId,
      postId: { $in: filteredPostIds }
    }).select("postId");

    const savedPostIds = new Set(savedDocs.map(s => s.postId.toString()));

    // COMMUNITY JOIN STATUS
    const joinedCommunities = await CommunityMember.find({ userId }).select("communityId");
    const joinedCommunityIds = new Set(joinedCommunities.map(i => i.communityId.toString()));

    // GROUP JOIN STATUS
    const groupMemberships = await GroupMember.find({ userId }).select("groupId status");

    const approvedGroupIds = new Set(
      groupMemberships.filter(g => g.status === "approved").map(g => g.groupId.toString())
    );

    const pendingGroupIds = new Set(
      groupMemberships.filter(g => g.status === "pending").map(g => g.groupId.toString())
    );

    const rejectedGroupIds = new Set(
      groupMemberships.filter(g => g.status === "rejected").map(g => g.groupId.toString())
    );

    // FETCH USER / COMMUNITY / GROUP DETAILS
    const users = await User.find({ _id: { $in: userIds } })
      .select("profileName profileImage");

    const communities = await Community.find({ _id: { $in: communityIds } })
      .select("name bannerImage");

    const groups = await Group.find({ _id: { $in: groupIds } })
      .select("name groupIcon");

    // MAPS
    const likeMap = Object.fromEntries(likeCounts.map(i => [i._id.toString(), i.count]));
    const shareMap = Object.fromEntries(shareCounts.map(i => [i._id.toString(), i.count]));
    const commentMap = Object.fromEntries(commentCounts.map(i => [i._id.toString(), i.count]));
    const followerMap = Object.fromEntries(followerCounts.map(i => [i._id.toString(), i.count]));

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          userId: u._id,
          name: u.profileName,
          image: u.profileImage || "",
          followersCount: followerMap[u._id.toString()] || 0
        }
      ])
    );

    const communityMap = Object.fromEntries(
      communities.map(c => [
        c._id.toString(),
        { id: c._id, name: c.name, image: c.bannerImage }
      ])
    );

    const groupMap = Object.fromEntries(
      groups.map(g => [
        g._id.toString(),
        { id: g._id, name: g.name, image: g.groupIcon }
      ])
    );

    // FINAL RESPONSE
    const postsWithStats = filteredPosts.map(post => {
      const postIdStr = post._id.toString();
      const userIdStr = post.userId.toString();

      const isLiked = likedPostIds.has(postIdStr);
      const isOwner = userIdStr === userId.toString();
      const isFollowed = followingIds.has(userIdStr);
      const isSaved = savedPostIds.has(postIdStr);

      let type = "user";
      let source = userMap[userIdStr];
      let joinStatus = "none";

      if (post.communityId) {
        const cid = post.communityId.toString();
        type = "community";
        source = communityMap[cid] || null;
        joinStatus = joinedCommunityIds.has(cid) ? "approved" : "none";
      }

      if (post.groupId) {
        const gid = post.groupId.toString();
        type = "group";
        source = groupMap[gid] || null;

        if (approvedGroupIds.has(gid)) joinStatus = "approved";
        else if (pendingGroupIds.has(gid)) joinStatus = "pending";
        else if (rejectedGroupIds.has(gid)) joinStatus = "rejected";
      }

      return {
        _id: post._id,
        content: post.content,
        privacy: post.privacy,
        media: post.media,
        link: post.slug,
        timeAgo: formatTimeAgo(post.createdAt),

        type,
        source,
        joinStatus,

        user: userMap[userIdStr] || {
          userId: post.userId,
          name: "",
          image: "",
          followersCount: followerMap[userIdStr] || 0
        },

        communityId: post.communityId || null,
        groupId: post.groupId || null,

        likeCount: likeMap[postIdStr] || 0,
        shareCount: shareMap[postIdStr] || 0,
        commentCount: commentMap[postIdStr] || 0,

        isCommunityPost: !!post.communityId,
        isGroupPost: !!post.groupId,
        isLiked,
        isOwner,
        isFollowed,
        isSaved
      };
    });

    return res.status(200).json({
      success: true,
      posts: postsWithStats,
      page: Number(page),
      limit: Number(limit)
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error fetching posts"
    });
  }
};

exports.getActivities = async (req, res) => {
  try {
    const { page, limit, userId } = req.params;
    // STEP 1 — Find user activity posts
    const likedPosts = await Like.find({ userId }).select("postId");
    const commentedPosts = await Comment.find({ userId }).select("postId");
    const sharedPosts = await Share.find({ userId }).select("postId");
    const activityPostIds = [
      ...new Set([
        ...likedPosts.map(i => i.postId.toString()),
        ...commentedPosts.map(i => i.postId.toString()),
        ...sharedPosts.map(i => i.postId.toString())
      ])
    ];

    if (activityPostIds.length === 0) {
      return res.status(200).json({
        success: true,
        posts: [],
        page: Number(page),
        limit: Number(limit)
      });
    }

    // STEP 2 — Fetch posts where the user has activity
    const posts = await Post.find({ _id: { $in: activityPostIds } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const postIds = posts.map(p => p._id);
    const userIds = posts.map(p => p.userId);
    const communityIds = posts.filter(p => p.communityId).map(p => p.communityId);
    const groupIds = posts.filter(p => p.groupId).map(p => p.groupId);

    // STEP 3 — LIKE / SHARE / COMMENT COUNTS
    const likeCounts = await Like.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    const shareCounts = await Share.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    // STEP 4 — FOLLOWER COUNTS
    const followerCounts = await Follower.aggregate([
      { $match: { following: { $in: userIds } } },
      { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);

    // STEP 5 — USER FOLLOWING LIST
    const followingDocs = await Follower.find({ follower: userId });
    const followingIds = new Set(followingDocs.map(d => d.following.toString()));

    // STEP 6 — Which posts user liked?
    const userLikes = await Like.find({ postId: { $in: postIds }, userId }).select("postId");
    const likedPostIds = new Set(userLikes.map(l => l.postId.toString()));

    // STEP 7 — Community join status
    const joinedCommunities = await CommunityMember.find({ userId }).select("communityId");
    const joinedCommunityIds = new Set(joinedCommunities.map(i => i.communityId.toString()));

    // STEP 8 — Group join status
    const groupMemberships = await GroupMember.find({ userId }).select("groupId status");

    const approvedGroupIds = new Set(
      groupMemberships.filter(g => g.status === "approved").map(g => g.groupId.toString())
    );

    const pendingGroupIds = new Set(
      groupMemberships.filter(g => g.status === "pending").map(g => g.groupId.toString())
    );

    const rejectedGroupIds = new Set(
      groupMemberships.filter(g => g.status === "rejected").map(g => g.groupId.toString())
    );

    // STEP 9 — Fetch user / community / group data
    const users = await User.find({ _id: { $in: userIds } })
      .select("profileName profileImage");

    const communities = await Community.find({ _id: { $in: communityIds } })
      .select("name communityIcon bannerImage");

    const groups = await Group.find({ _id: { $in: groupIds } })
      .select("name groupIcon");

    // STEP 10 — Maps
    const likeMap = Object.fromEntries(likeCounts.map(i => [i._id.toString(), i.count]));
    const shareMap = Object.fromEntries(shareCounts.map(i => [i._id.toString(), i.count]));
    const commentMap = Object.fromEntries(commentCounts.map(i => [i._id.toString(), i.count]));
    const followerMap = Object.fromEntries(followerCounts.map(i => [i._id.toString(), i.count]));

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          userId: u._id,
          name: u.profileName,
          image: u.profileImage || "",
          followersCount: followerMap[u._id.toString()] || 0
        }
      ])
    );

    const communityMap = Object.fromEntries(
      communities.map(c => [
        c._id.toString(),
        { id: c._id, name: c.name, image: c.bannerImage }
      ])
    );

    const groupMap = Object.fromEntries(
      groups.map(g => [
        g._id.toString(),
        { id: g._id, name: g.name, image: g.groupIcon }
      ])
    );

    // STEP 11 — Final Response Model (Same as Posts)
    const activities = posts.map(post => {
      const postIdStr = post._id.toString();
      const userIdStr = post.userId.toString();

      const isLiked = likedPostIds.has(postIdStr);
      const isOwner = userIdStr === userId.toString();
      const isFollowed = followingIds.has(userIdStr);

      let type = "user";
      let source = userMap[userIdStr];
      let joinStatus = "none";

      if (post.communityId) {
        const cid = post.communityId.toString();
        type = "community";
        source = communityMap[cid] || null;

        joinStatus = joinedCommunityIds.has(cid) ? "approved" : "none";
      }

      if (post.groupId) {
        const gid = post.groupId.toString();
        type = "group";
        source = groupMap[gid] || null;

        if (approvedGroupIds.has(gid)) joinStatus = "approved";
        else if (pendingGroupIds.has(gid)) joinStatus = "pending";
        else if (rejectedGroupIds.has(gid)) joinStatus = "rejected";
        else joinStatus = "none";
      }

      return {
        _id: post._id,
        content: post.content,
        privacy: post.privacy,
        media: post.media,
        link: post.slug,
        timeAgo: formatTimeAgo(post.createdAt),

        type,
        source,
        joinStatus,

        user: userMap[userIdStr] || {
          userId: post.userId,
          name: "",
          image: "",
          followersCount: followerMap[userIdStr] || 0
        },

        communityId: post.communityId || null,
        groupId: post.groupId || null,

        likeCount: likeMap[postIdStr] || 0,
        shareCount: shareMap[postIdStr] || 0,
        commentCount: commentMap[postIdStr] || 0,

        isCommunityPost: !!post.communityId,
        isGroupPost: !!post.groupId,
        isLiked,
        isOwner,
        isFollowed
      };
    });

    return res.status(200).json({
      success: true,
      posts: activities, // same response key "posts"
      page: Number(page),
      limit: Number(limit)
    });

  } catch (error) {
    console.error("ACTIVITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching activity feed"
    });
  }
};
exports.getSinglePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!postId || !userId) {
      return res.status(400).json({
        success: false,
        message: "postId and userId are required"
      });
    }

    // ---------- Fetch Post ----------
    const post = await Post.findById(postId).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // ---------- Parallel Queries (FAST) ----------
    const [
      likeCount,
      commentCount,
      shareCount,
      isLikedDoc,
      isSavedDoc,
      postedUser,
      followerCount,
      followDocs
    ] = await Promise.all([
      Like.countDocuments({ postId }),
      Comment.countDocuments({ postId }),
      Share.countDocuments({ postId }),
      Like.exists({ postId, userId }),
      SavedPost.exists({ postId, userId }), // ✅ SAVED CHECK
      User.findById(post.userId)
        .select("profileName profileImage")
        .lean(),
      Follower.countDocuments({ following: post.userId }),
      Follower.find({ follower: userId }).lean()
    ]);

    // ---------- Safety ----------
    if (!postedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isLiked = Boolean(isLikedDoc);
    const isSaved = Boolean(isSavedDoc); // ✅ FINAL FLAG
    const isOwner = post.userId.toString() === userId.toString();

    // ---------- Follow ----------
    const followingIds = new Set(
      followDocs.map(d => d.following.toString())
    );

    const isFollowed = followingIds.has(post.userId.toString());

    // ---------- Default Source ----------
    let type = "user";
    let source = {
      userId: postedUser._id,
      name: postedUser.profileName,
      image: postedUser.profileImage || "",
      followersCount: followerCount
    };

    let joinStatus = "none";

    // ---------- Community ----------
    if (post.communityId) {
      type = "community";

      const [community, member] = await Promise.all([
        Community.findById(post.communityId)
          .select("name communityIcon bannerImage")
          .lean(),
        CommunityMember.findOne({
          communityId: post.communityId,
          userId
        }).select("status")
      ]);

      if (community) {
        source = {
          id: community._id,
          name: community.name,
          image: community.bannerImage || community.communityIcon
        };
      }

      if (member?.status === "approved") joinStatus = "approved";
      else if (member?.status === "pending") joinStatus = "pending";
      else if (member?.status === "rejected") joinStatus = "rejected";
    }

    // ---------- Group ----------
    if (post.groupId) {
      type = "group";

      const [group, member] = await Promise.all([
        Group.findById(post.groupId)
          .select("name groupIcon")
          .lean(),
        GroupMember.findOne({
          groupId: post.groupId,
          userId
        }).select("status")
      ]);

      if (group) {
        source = {
          id: group._id,
          name: group.name,
          image: group.groupIcon
        };
      }

      if (member?.status === "approved") joinStatus = "approved";
      else if (member?.status === "pending") joinStatus = "pending";
      else if (member?.status === "rejected") joinStatus = "rejected";
    }

    // ---------- Final Response ----------
    const formattedPost = {
      _id: post._id,
      content: post.content,
      media: post.media,
      privacy: post.privacy,
      createdAt: post.createdAt,
      timeAgo: formatTimeAgo(post.createdAt),

      type,
      source,
      joinStatus,

      user: {
        userId: postedUser._id,
        name: postedUser.profileName,
        image: postedUser.profileImage || "",
        followersCount: followerCount
      },

      likeCount,
      commentCount,
      shareCount,

      isLiked,
      isSaved,   // ✅ HERE IS YOUR SAVED KEY
      isOwner,
      isFollowed
    };

    return res.status(200).json({
      success: true,
      post: formattedPost
    });

  } catch (error) {
    console.error("Single Post Fetch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message
    });
  }
};
// ✅ Get Single Post by ID
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // ---------- Stats ----------
    const [likeCount, commentCount, shareCount] = await Promise.all([
      Like.countDocuments({ postId: id }),
      Comment.countDocuments({ postId: id }),
      Share.countDocuments({ postId: id })
    ]);

    // ❌ No logged-in user → disable these
    const isLiked = false;
    const isOwner = false;
    const isFollowed = false;
    let joinStatus = "none";

    // ---------- User (Post Owner) ----------
    const postedUser = await User.findById(post.userId)
      .select("profileName profileImage")
      .lean();

    const followerCount = await Follower.countDocuments({
      following: postedUser._id
    });

    // ---------- Default Source ----------
    let type = "user";
    let source = {
      userId: postedUser._id,
      name: postedUser.profileName,
      image: postedUser.profileImage || "",
      followersCount: followerCount
    };

    // ---------- Community ----------
    if (post.communityId) {
      type = "community";

      const community = await Community.findById(post.communityId)
        .select("name bannerImage")
        .lean();

      source = {
        id: community._id,
        name: community.name,
        image: community.bannerImage
      };
    }

    // ---------- Group ----------
    if (post.groupId) {
      type = "group";

      const group = await Group.findById(post.groupId)
        .select("name groupIcon")
        .lean();

      source = {
        id: group._id,
        name: group.name,
        image: group.groupIcon
      };
    }

    // ---------- Final Response ----------
    const formattedPost = {
      _id: post._id,
      content: post.content,
      media: post.media,
      privacy: post.privacy,
      createdAt: post.createdAt,
      timeAgo: formatTimeAgo(post.createdAt),

      type,
      source,
      joinStatus,

      user: {
        userId: postedUser._id,
        name: postedUser.profileName,
        image: postedUser.profileImage || "",
        followersCount: followerCount
      },

      likeCount,
      commentCount,
      shareCount,
      isLiked,
      isOwner,
      isFollowed
    };

    return res.status(200).json({
      success: true,
      post: formattedPost
    });

  } catch (error) {
    console.error("getPostById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message
    });
  }
};

// ✅ Like/Unlike Post
exports.likePost = async (req, res) => {
  try {
    const { id } = req.params; // postId
    const { userId } = req.body; // liker
    console.log("dsdfgbhnm")

    const post = await Post.findById(id)
      .populate("userId", "profileName profileImage");

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const existingLike = await Like.findOne({ postId: id, userId });

    if (existingLike) {
      await Like.deleteOne({ _id: existingLike._id });

      const likeCount = await Like.countDocuments({ postId: id });
      const io = req.app.get("io");
      if (io) {
        io.emit("postLiked", {
          postId: id,
          actorUserId: userId,
          isLiked: false,
          likeCount,
          createdAt: new Date().toISOString(),
        });
      }

      return res.json({ success: true, message: "Post unliked" });
    }

    await Like.create({ postId: id, userId });
    // Prevent notifying self
    if (post.userId._id.toString() !== userId) {
      await createLikeNotification({ post, likerId: userId });
    }

    const likeCount = await Like.countDocuments({ postId: id });
    const io = req.app.get("io");
    if (io) {
      io.emit("postLiked", {
        postId: id,
        actorUserId: userId,
        isLiked: true,
        likeCount,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ success: true, message: "Post liked" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sharePost = async (req, res) => {
  try {
    const { id } = req.params; // Post ID
    const { userId } = req.body; // User who is sharing

    // Check if the post exists
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const newShare = new Share({ postId: id, userId });
    await newShare.save();

    await Post.findByIdAndUpdate(id, { $inc: { shares: 1 } });

    await createShareSuccessNotification({ userId, post });

    res.status(200).json({ success: true, message: "Post shared successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error sharing post" });
  }
};

// ✅ Add Comment
exports.addComment = async (req, res) => {
  try {

    const {
      userId,
      text,
      parentId,
    } = req.body;

    const postId = req.params.postId;

    // ==========================================
    // CREATE COMMENT
    // ==========================================
    const newComment = await Comment.create({
      postId,
      userId,
      text,
      parentId: parentId || null,
    });

    // ==========================================
    // FETCH POST
    // ==========================================
    const post = await Post.findById(postId)
      .populate(
        "userId",
        "profileName profileImage"
      );

    if (!post) {

      return res.status(404).json({
        success: false,
        message: "Post not found",
      });

    }

    // ==========================================
    // FETCH COMMENTER
    // ==========================================
    const commenter = await User.findById(userId)
      .select("profileName profileImage");

    // ==========================================
    // REPLY COMMENT
    // ==========================================
    if (parentId) {

      console.log(
        "PARENT ID =>",
        parentId
      );

      const parentComment =
        await Comment.findById(parentId)
          .populate(
            "userId",
            "profileName profileImage"
          );

      console.log(
        "PARENT COMMENT =>",
        parentComment
      );

      if (parentComment) {

        // ======================================
        // REPLY COMMENT OWNER
        // ======================================
        if (!post.groupId) {

          await replyCommentOwnerNotification({

            post,

            parentComment,

            replyComment: newComment,

            replier: commenter,

            replierId: userId,

          });

        }

        // ======================================
        // REPLY GROUP COMMENT OWNER
        // ======================================
        if (post.groupId) {

          const group = await Group.findById(
            post.groupId
          ).select("name groupIcon");

          await replyGroupCommentNotification({

            post,

            parentComment,

            replyComment: newComment,

            replier: commenter,

            group,

            replierId: userId,

          });

        }

        // ======================================
        // REPLY POST OWNER
        // ======================================
        await replyPostOwnerNotification({

          post,

          parentComment,

          replyComment: newComment,

          replier: commenter,

          replierId: userId,

        });

      }

    }

    // ==========================================
    // NORMAL COMMENT
    // ==========================================
    else {

      if (
        post.userId?._id?.toString() !==
        userId.toString()
      ) {

        await createCommentNotification({

          post,

          comment: newComment,

          commenterId: userId,

        });

      }

    }

    // ==========================================
    // COMMENT COUNT
    // ==========================================
    const commentCount =
      await Comment.countDocuments({
        postId,
      });

    // ==========================================
    // SOCKET EMIT
    // ==========================================
    const io = req.app.get("io");

    if (io) {

      io.emit("postCommented", {

        postId,

        actorUserId: userId,

        commentId:
          newComment._id?.toString(),

        text: newComment.text,

        parentId:
          newComment.parentId
            ? newComment.parentId.toString()
            : null,

        commentCount,

        createdAt:
          new Date().toISOString(),

      });

    }

    // ==========================================
    // RESPONSE
    // ==========================================
    return res.status(201).json({

      success: true,

      message:
        "Comment added successfully",

      comment: newComment,

    });

  } catch (error) {

    console.error(
      "ADD COMMENT ERROR =>",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Error adding comment",

      error: error.message,

    });

  }
};

exports.editPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, media, privacy } = req.body;
    console.log(req.body)
    // Validate ID
    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    // Find existing post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Update content only if provided
    if (content !== undefined && content !== null) {
      post.content = content.trim();
    }

    // Update media only if provided AND it's not empty
    if (media !== undefined && media !== null) {
      // If you want to replace only when array has elements
      if (Array.isArray(media) && media.length > 0) {
        post.media = media;
      }
      // If you want to allow empty array to clear media, remove the above condition
    }

    // Validate and update privacy
    const allowedPrivacy = ["Public", "Private", "Friends"];
    if (privacy !== undefined && privacy !== null) {
      if (!allowedPrivacy.includes(privacy)) {
        return res.status(400).json({
          success: false,
          message: "Invalid privacy option",
        });
      }
      post.privacy = privacy;
    }

    // Save updated post
    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: post,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ✅ Delete Post
exports.deletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.postId);
    await SavedPost.deleteMany({ postId: null });
    res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error deleting post" });
  }
};
exports.getPostShares = async (req, res) => {
  try {
    const { id } = req.params; // Post ID

    // Count shares for the post
    const shareCount = await Share.countDocuments({ postId: id });

    res.status(200).json({ success: true, shareCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching share count" });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.query;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Invalid postId",
      });
    }

    /* ================= FETCH ALL COMMENTS ================= */
    const comments = await Comment.find({ postId })
      .sort({ createdAt: 1 }) // old → new (tree needs this)
      .populate("userId", "profileName profileImage")
      .lean();

    /* ================= BUILD MAP ================= */
    const commentMap = {};
    comments.forEach((c) => {
      commentMap[c._id] = {
        ...c,
        likesCount: c.likes?.length || 0,
        isLiked: userId
          ? c.likes?.some((id) => id.toString() === userId)
          : false,
        timeAgo: formatTimeAgo(c.createdAt),
        replies: [],
      };
    });

    /* ================= BUILD TREE ================= */
    const roots = [];

    comments.forEach((c) => {
      if (c.parentId) {
        commentMap[c.parentId]?.replies.push(commentMap[c._id]);
      } else {
        roots.push(commentMap[c._id]);
      }
    });

    /* ================= SORT ROOT COMMENTS (NEWEST FIRST) ================= */
    roots.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      comments: roots,
    });

  } catch (error) {
    console.error("GET COMMENTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching comments",
    });
  }
};

exports.getUserPostImages = async (req, res) => {
  try {
    const { userId } = req.params; // User ID from request params

    const images = await Post.find({ userId, media: { $ne: [] } }).select("media");

    const imageUrls = images.flatMap(post => post.media);

    res.status(200).json({ success: true, images: imageUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching user's post images" });
  }
};
exports.getUserPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId } = req.params;
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const postIds = posts.map(p => p._id);
    const userIds = posts.map(p => p.userId);
    const communityIds = posts.filter(p => p.communityId).map(p => p.communityId);
    const groupIds = posts.filter(p => p.groupId).map(p => p.groupId);

    // LIKE / SHARE / COMMENT COUNTS
    const likeCounts = await Like.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    const shareCounts = await Share.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } }
    ]);

    // followerCounts aggregation remains same
    const followerCounts = await Follower.aggregate([
      { $match: { following: { $in: userIds } } },
      { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);

    // Following list for logged user
    const followingDocs = await Follower.find({ follower: userId }).lean();
    const followingIds = new Set(
      followingDocs.map(d => d.following.toString())
    );

    // USER LIKED WHICH POSTS?
    const userLikes = await Like.find({ postId: { $in: postIds }, userId }).select("postId");
    const likedPostIds = new Set(userLikes.map(l => l.postId.toString()));

    // USER JOINED WHICH GROUPS / COMMUNITIES?
    const joinedCommunities = await CommunityMember.find({ userId }).select("communityId");
    const joinedGroups = await GroupMember.find({ userId }).select("groupId");

    const joinedCommunityIds = new Set(joinedCommunities.map(i => i.communityId.toString()));
    const joinedGroupIds = new Set(joinedGroups.map(i => i.groupId.toString()));

    // FETCH user / community / group details
    const users = await User.find({ _id: { $in: userIds } })
      .select("profileName profileImage");

    const communities = await Community.find({ _id: { $in: communityIds } })
      .select("name communityIcon");
    const groups = await Group.find({ _id: { $in: groupIds } })
      .select("name groupIcon");

    // CREATE MAPS
    const likeMap = Object.fromEntries(likeCounts.map(i => [i._id.toString(), i.count]));
    const shareMap = Object.fromEntries(shareCounts.map(i => [i._id.toString(), i.count]));
    const commentMap = Object.fromEntries(commentCounts.map(i => [i._id.toString(), i.count]));
    const followerMap = Object.fromEntries(followerCounts.map(i => [i._id.toString(), i.count]));

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          userId: u._id,
          name: u.profileName,
          image: u.profileImage || "",
          followersCount: followerMap[u._id.toString()] || 0
        }
      ])
    );

    const communityMap = Object.fromEntries(
      communities.map(c => [
        c._id.toString(),
        { id: c._id, name: c.name, image: c.bannerImage }
      ])
    );

    const groupMap = Object.fromEntries(
      groups.map(g => [
        g._id.toString(),
        { id: g._id, name: g.name, image: g.groupIcon }
      ])
    );

    // FINAL RESPONSE
    const postsWithStats = posts.map(post => {
      const isLiked = likedPostIds.has(post._id.toString());
      const isOwner = post.userId.toString() === userId.toString();
      const isFollowed = followingIds.has(post.userId.toString());

      let type = "user";
      let source = userMap[post.userId.toString()];
      let isJoined = false;

      if (post.communityId) {
        type = "community";
        source = communityMap[post.communityId.toString()] || null;
        isJoined = joinedCommunityIds.has(post.communityId.toString());
      }

      if (post.groupId) {
        type = "group";
        source = groupMap[post.groupId.toString()] || null;
        isJoined = joinedGroupIds.has(post.groupId.toString());
      }

      return {
        _id: post._id,
        content: post.content,
        privacy: post.privacy,
        media: post.media,
        link: post.slug,
        timeAgo: formatTimeAgo(post.createdAt),   // ⏰ NEW FIELD
        type,         // "user" | "community" | "group"
        source,       // related profile/community/group info
        isJoined,     // 🔥 NEW
        user: userMap[post.userId.toString()] || {
          userId: post.userId,
          name: "",
          image: "",
          followersCount: followerMap[post.userId.toString()] || 0
        },
        communityId: post.communityId || null,
        groupId: post.groupId || null,
        likeCount: likeMap[post._id.toString()] || 0,
        shareCount: shareMap[post._id.toString()] || 0,
        commentCount: commentMap[post._id.toString()] || 0,

        isCommunityPost: !!post.communityId,
        isGroupPost: !!post.groupId,
        isLiked,
        isOwner,
        isFollowed
      };
    });

    return res.status(200).json({
      success: true,
      posts: postsWithStats,
      page: Number(page),
      limit: Number(limit)
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Error fetching posts" });
  }
};
exports.getSavedPost = async (req, res) => {
  try {
    const { userId } = req.params;     // logged-in user
    const viewerId = req.query.viewerId || userId; // viewer for follow/likes

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }

    // Fetch saved posts
    const savedDocs = await SavedPost.find({ userId })
      .populate("postId")
      .lean();


    if (!savedDocs.length) {
      return res.status(200).json({ success: true, posts: [] });
    }
    const validSavedDocs = savedDocs.filter(s => s.postId !== null);

    const posts = validSavedDocs.map(s => s.postId);
    const postIds = posts.map(p => p?._id).filter(Boolean);
    const userIds = posts.map(p => p?.userId).filter(Boolean);
    const communityIds = posts.filter(p => p?.communityId).map(p => p.communityId);
    const groupIds = posts.filter(p => p?.groupId).map(p => p.groupId);


    // LIKE, COMMENT, SHARE COUNT
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

    const likeMap = Object.fromEntries(likeCounts.map(i => [i._id.toString(), i.count]));
    const commentMap = Object.fromEntries(commentCounts.map(i => [i._id.toString(), i.count]));
    const shareMap = Object.fromEntries(shareCounts.map(i => [i._id.toString(), i.count]));

    // USER DETAILS
    const users = await User.find({ _id: { $in: userIds } })
      .select("profileName profileImage")
      .lean();

    const userFollowers = await Follower.aggregate([
      { $match: { following: { $in: userIds.map(id => id.toString()) } } },
      { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);

    const followerMap = Object.fromEntries(
      userFollowers.map(i => [i._id.toString(), i.count])
    );

    const userMap = Object.fromEntries(
      users.map(u => [
        u._id.toString(),
        {
          userId: u._id,
          name: u.profileName,
          image: u.profileImage || "",
          followersCount: followerMap[u._id.toString()] || 0
        }
      ])
    );

    // COMMUNITY + GROUP FETCH
    const communities = await Community.find({ _id: { $in: communityIds } })
      .select("name communityIcon")
      .lean();

    const groups = await Group.find({ _id: { $in: groupIds } })
      .select("name groupIcon")
      .lean();

    const communityMap = Object.fromEntries(
      communities.map(c => [
        c._id.toString(),
        { id: c._id, name: c.name, image: c.communityIcon }
      ])
    );

    const groupMap = Object.fromEntries(
      groups.map(g => [
        g._id.toString(),
        { id: g._id, name: g.name, image: g.groupIcon }
      ])
    );

    // FOLLOW STATUS
    const followDocs = await Follower.find({ follower: viewerId }).lean();
    const followingIds = new Set(
      followDocs.map(doc => doc.following.toString())
    );

    // LIKE STATUS
    const likedDocs = await Like.find({ userId: viewerId, postId: { $in: postIds } });
    const likedSet = new Set(likedDocs.map(l => l.postId.toString()));

    // JOIN STATUS
    const joinedCommunities = await CommunityMember.find({ userId }).lean();
    const joinedGroups = await GroupMember.find({ userId }).lean();

    const joinedCommunityIds = new Set(joinedCommunities.map(i => i.communityId.toString()));
    const joinedGroupIds = new Set(joinedGroups.map(i => i.groupId.toString()));

    // FORMAT FINAL RESPONSE
    const formattedPosts = posts.map(post => {
      let type = "user";
      let source = userMap[post.userId.toString()];
      let isJoined = false;

      if (post.communityId) {
        type = "community";
        source = communityMap[post.communityId.toString()];
        isJoined = joinedCommunityIds.has(post.communityId.toString());
      }

      if (post.groupId) {
        type = "group";
        source = groupMap[post.groupId.toString()];
        isJoined = joinedGroupIds.has(post.groupId.toString());
      }

      return {
        _id: post._id,
        content: post.content,
        media: post.media,
        privacy: post.privacy,
        timeAgo: formatTimeAgo(post.createdAt),
        createdAt: post.createdAt,

        type,
        source,
        isJoined,

        user: userMap[post.userId.toString()],

        likeCount: likeMap[post._id.toString()] || 0,
        commentCount: commentMap[post._id.toString()] || 0,
        shareCount: shareMap[post._id.toString()] || 0,
        isSaved: true, // ✅ ADD THIS

        isLiked: likedSet.has(post._id.toString()),
        isOwner: post.userId.toString() === viewerId.toString(),
        isFollowed: followingIds.has(post.userId.toString())
      };
    });

    return res.status(200).json({
      success: true,
      posts: formattedPosts
    });

  } catch (error) {
    console.error("Saved Posts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching saved posts",
      error: error.message
    });
  }
};


exports.toggleLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // REMOVE LIKE (Unlike)
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
    } else {
      // ADD LIKE
      comment.likes.push(userId);
    }

    await comment.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("commentLiked", {
        commentId: comment._id?.toString(),
        postId: comment.postId?.toString(),
        actorUserId: userId,
        liked: !hasLiked,
        likesCount: comment.likes.length,
        createdAt: new Date().toISOString(),
      });
    }
    return res.json({
      success: true,
      liked: !hasLiked,
      likesCount: comment.likes.length,
      message: hasLiked ? "Like removed" : "Like added"
    });

  } catch (err) {
    console.error("LIKE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

