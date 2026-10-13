const User = require("../models/user");
const Group = require("../models/group/group");
const GroupMember = require("../models/group/groupMembers");
const Service = require("../models/service");
const Follows = require("../models/followingfollowers/followersandfollowing");

exports.search = async (req, res) => {
  try {
    const { type, q = "", page = 1, limit = 10, userId } = req.query;
    console.log(userId)
    const skip = (page - 1) * limit;

    let results = [];
    let total = 0;
    /* ================= PEOPLE ================= */
    if (type === "people") {
      const query = {
        profileName: { $regex: q, $options: "i" },
        _id: { $ne: userId }, // exclude self
      };

      const users = await User.find(query)
        .select("profileName profileImage profession nativeCountry currentCountry")
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const userIds = users.map(u => u._id);

      // 🔥 find following relations
      const following = await Follows.find({
        follower: userId,
        following: { $in: userIds },
      }).lean();

      const followingSet = new Set(
        following.map(f => f.following.toString())
      );

      results = users.map(u => ({
        _id: u._id,
        profileName: u.profileName,
        profileImage: u.profileImage,
        followersCount: u.followersCount || 0,
        profession:u.profession,
        currentCountry:u.currentCountry,
        nativeCountry:u.nativeCountry,
        isFollowing: followingSet.has(u._id.toString()),
      }));

      total = await User.countDocuments(query);
    }
    /* ================= GROUPS ================= */
    if (type === "groups") {
  const query = {
    name: { $regex: q, $options: "i" },
  };

  const groups = await Group.find(query)
    .select("name groupBanner description groupIcon country createdBy")
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const groupIds = groups.map(g => g._id);

  // ✅ Approved members count
  const approvedCounts = await GroupMember.aggregate([
    {
      $match: {
        groupId: { $in: groupIds },
        status: "approved",
      },
    },
    {
      $group: {
        _id: "$groupId",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = {};
  approvedCounts.forEach(m => {
    countMap[m._id.toString()] = m.count;
  });

  // ✅ User memberships
  const joined = await GroupMember.find({
    userId,
    groupId: { $in: groupIds },
  }).lean();

  const joinedMap = {};
  joined.forEach(j => {
    joinedMap[j.groupId.toString()] = j.status;
  });

  results = groups.map(g => {
    const groupIdStr = g._id.toString();
    const adminId = g.createdBy?.toString();

    // ✅ Member count (approved + admin)
    let memberCount = countMap[groupIdStr] || 0;

    if (adminId) {
      memberCount += 1; // add admin
    }

    // ✅ isAdmin
    const isAdmin = adminId === userId;

    // ✅ join status
    let joinStatus = "none";
    let isJoined = false;

    if (isAdmin) {
      joinStatus = "approved";
      isJoined = true;
    } else if (joinedMap[groupIdStr]) {
      if (joinedMap[groupIdStr] === "approved") {
        joinStatus = "approved";
        isJoined = true;
      } else if (joinedMap[groupIdStr] === "pending") {
        joinStatus = "pending";
      }
    }

    return {
      _id: g._id,
      name: g.name,
      bannerImage: g.groupBanner,
      description: g.description,
      membersCount: memberCount,
      isJoined,
      icon:g.groupIcon,
      country:g.country,
      joinStatus,
      isAdmin,
    };
  });

  total = await Group.countDocuments(query);
}

    /* ================= SERVICES ================= */
   if (type === "services") {
  const query = {
    brandName: { $regex: q, $options: "i" },
  };

  const services = await Service.find(query)
    .select("brandName logo rating banners userId addressLine")
    .populate("category", "title")   // 🔥 get category name
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // 🔥 service owner ids (updated field name)
  const ownerIds = services.map(s => s.userId).filter(Boolean);

  // 🔥 follow service owner
  const followedOwners = await Follows.find({
    follower: userId,
    following: { $in: ownerIds },
  }).lean();

  const followedSet = new Set(
    followedOwners.map(f => f.following.toString())
  );

  results = services.map(s => ({
    _id: s._id,
    brandName: s.brandName,
    logo: s.logo,
    category: s.category?.title || "",   // 🔥 updated
    rating: s.rating || 0,
    banners:s.banners,
    addressLine:s.addressLine,
    isFollowing: followedSet.has(String(s.userId)),
  }));

  total = await Service.countDocuments(query);
}

    return res.json({
      success: true,
      data: results,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        hasMore: skip + results.length < total,
      },
    });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};
