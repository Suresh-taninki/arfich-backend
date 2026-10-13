const Follow = require("../../models/followingfollowers/followersandfollowing");
const { handleFollowerMilestones } = require("../hxp");
const User=require("../../models/user")
const Notification=require("../../models/notifications");
const { createOrUpdateNotification, createFollowNotification } = require("../../middleware/notification");
 const mongoose = require("mongoose");
exports.followUser = async (req, res) => {
  try {
    const { userId, currentUserId } = req.body;

    if (!userId || !currentUserId) {
      return res.status(400).json({ success: false, message: "User IDs are required" });
    }

    if (userId === currentUserId) {
      return res.status(200).json({ success: false, message: "You cannot follow yourself." });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({ follower: currentUserId, following: userId });

    if (existingFollow) {
      // UNFOLLOW
      await Follow.deleteOne({ _id: existingFollow._id });

      const followerCount = await Follow.countDocuments({ following: userId });

      const io = req.app.get("io");
      if (io) {
        const payload = {
          targetUserId: userId,
          actorUserId: currentUserId,
          isFollowing: false,
          followerCount,
          createdAt: new Date().toISOString(),
        };
        io.to(userId).emit("followRemoved", payload);
        io.to(currentUserId).emit("followRemoved", payload);
      }

      return res.status(200).json({
        success: true,
        message: "Unfollowed successfully",
        isFollowing: false,
        followerCount
      });
    }

    // FOLLOW action
    await Follow.create({ follower: currentUserId, following: userId });
    await handleFollowerMilestones(currentUserId);
    // Fetch follower (sender) details
    const followerUser = await User.findById(currentUserId).select("profileName profileImage");

    // Send FOLLOW Notification
    const notif = await createFollowNotification({ userId, followerId: currentUserId });

    const followerCount = await Follow.countDocuments({ following: userId });

    const io = req.app.get("io");
    if (io) {
      const payload = {
        targetUserId: userId,
        actorUserId: currentUserId,
        isFollowing: true,
        followerCount,
        createdAt: new Date().toISOString(),
      };
      io.to(userId).emit("followCreated", payload);
      io.to(currentUserId).emit("followCreated", payload);

      if (notif) {
        io.to(userId).emit("notificationCreated", {
          notification: notif,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Followed successfully",
      isFollowing: true,
      followerCount
    });

  } catch (error) {
    console.error("Follow error:", error);
    return res.status(500).json({
      success: false,
      message: "Error following/unfollowing user",
      error: error.message
    });
  }
};

exports.getFollowStats = async (req, res) => {
  try {
    const { id } = req.params;

    const followersCount = await Follow.countDocuments({ following: id });
    const followingCount = await Follow.countDocuments({ follower: id });

    res.status(200).json({ success: true, followers: followersCount, following: followingCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching follow stats" });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;          // profile user whose followers list opened
    const { loginUserId } = req.query;     // logged in user id'
    console.log(userId,loginUserId)
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId"
      });
    }

    const normalizedLoginUserId =
      loginUserId && loginUserId !== "null" && loginUserId !== "undefined" && mongoose.Types.ObjectId.isValid(loginUserId)
        ? loginUserId
        : null;

    // ===============================
    // 1. Get followers of profile user
    // ===============================
    const followers = await Follow.find({
      following: userId
    })
      .populate(
        "follower",
        "firstName profileName profileImage currentCountry nativeCountry"
      )
      .lean();

    // ===============================
    // 2. Logged in user following list
    // ===============================
    let loginFollowingIds = new Set();

    if (normalizedLoginUserId) {
      const myFollowing = await Follow.find({
        follower: normalizedLoginUserId
      })
        .select("following")
        .lean();

      loginFollowingIds = new Set(
        myFollowing.map(item => item.following.toString())
      );
    }

    // ===============================
    // 3. Build response
    // ===============================
    const result = followers
      .filter(item => item.follower)
      .map(item => ({
        ...item.follower,

        // login user follows this follower?
        isFollowed: loginFollowingIds.has(
          item.follower._id.toString()
        ),

        // optional same key if frontend uses old name
        isFollowingBack: loginFollowingIds.has(
          item.follower._id.toString()
        )
      }));

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get Followers Error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};


// BACKEND
exports.getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;       // profile opened user
    const { loginUserId } = req.query;  // logged in user

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid userId"
      });
    }

    const normalizedLoginUserId =
      loginUserId && loginUserId !== "null" && loginUserId !== "undefined" && mongoose.Types.ObjectId.isValid(loginUserId)
        ? loginUserId
        : null;

    // ===============================
    // 1. People profile user follows
    // ===============================
    const following = await Follow.find({
      follower: userId
    })
      .populate(
        "following",
        "firstName profileName profileImage currentCountry nativeCountry"
      )
      .lean();

    // ===============================
    // 2. Logged in user following list
    // ===============================
    let loginFollowingIds = new Set();

    if (normalizedLoginUserId) {
      const myFollowing = await Follow.find({
        follower: normalizedLoginUserId
      })
        .select("following")
        .lean();

      loginFollowingIds = new Set(
        myFollowing.map(item => item.following.toString())
      );
    }

    // ===============================
    // 3. Build response
    // ===============================
    const result = following
      .filter(item => item.following)
      .map(item => ({
        ...item.following,

        // logged in user follows this person?
        isFollowed: loginFollowingIds.has(
          item.following._id.toString()
        ),

        // optional old key
        isMutual: loginFollowingIds.has(
          item.following._id.toString()
        )
      }));

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get Following Error:", error);

    return res.status(500).json({
      message: "Server error"
    });
  }
};
