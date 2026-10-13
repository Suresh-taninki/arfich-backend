const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Otp = require("../models/otp");
const sendEmail = require("../middleware/mailSender");
const { generateToken } = require("../middleware/authMiddleware");
const Follows = require("../models/followingfollowers/followersandfollowing")
const Post = require("../models/userPosts/Post")
const GroupMember = require("../models/group/groupMembers")
const Comment = require("../models/userPosts/comments")
const Notification = require("../models/notifications")

// **User Registration**
async function generateReferralCode(firstName) {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
  const code = firstName.substring(0, 4).toUpperCase() + randomNum;

  // Ensure the code is unique
  const existingUser = await User.findOne({ referralCode: code });
  return existingUser ? generateReferralCode(firstName) : code;
}

// User Registration API with Referral System
exports.userRegister = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      profileName,
      email,
      mobile,
      password,
      confirmPassword,
      location,
      profileImage,
      bannerImage,
      refer,
      deviceTokens,

    } = req.body;
    console.log(req.body)

    // Validate required fields
    if (!firstName || !lastName || !email || !mobile || !password) {
      return res.status(200).json({
        responseCode: 400,
        message: "Required fields missing"
      });
    }

    // Check email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(200).json({
        responseCode: 400,
        message: "Email already exists"
      });
    }

    // Check phone already exists
    const existingPhone = await User.findOne({ "mobile.number": mobile.number });
    if (existingPhone) {
      return res.status(200).json({
        responseCode: 400,
        message: "Phone already exists"
      });
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      return res.status(200).json({
        responseCode: 400,
        message: "Passwords do not match"
      });
    }

    // Add hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Referral code for the new user
    const referralCode = await generateReferralCode(firstName);

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // For profile & banner image from FormData

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      profileName,
      email,
      mobile: {
        countryCode: mobile.countryCode,
        number: mobile.number
      },
      password: hashedPassword,
      referralCode,
      location,
      profileImage,
      bannerImage,
      emailOtp: otp,
      deviceTokens,
      otpExpiry,
      emailVerified: false,
      phoneVerified: false
    });

    // HANDLE REFERRAL
    if (refer) {
      const referrer = await User.findOne({ referralCode: refer });

      if (!referrer) {
        return res.status(200).json({
          responseCode: 400,
          message: "Invalid referral code"
        });
      }

      newUser.referredBy = referrer._id;
      referrer.points += 500;
      referrer.lifetimePointsEarned += 500;
      await referrer.save();
    }

    // Save user
    const savedUser = await newUser.save();

    // Send OTP to email
    await sendEmail(email, "HloXpat", `Your OTP is: ${otp}`);

    return res.status(200).json({
      responseCode: 200,
      message: "OTP sent to email. Please verify.",
      userId: savedUser._id,
      email: savedUser.email
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(200).json({
      responseCode: 500,
      message: "Server error",
      error: error.message
    });
  }
};



// Get volunteer by ID
exports.getUserById = async (req, res) => {
  try {
    const _id = req.params.userId; // ✅ userId from verified JWT

    // ✅ Fetch user details excluding sensitive fields
    const user = await User.findById(_id)
      .select("-password -emailOtp -phoneOtp -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user) {
      return res.status(404).json({ responseCode: 404, message: "User not found" });
    }

    // ✅ Count followers & following
    const followersCount = await Follows.countDocuments({ following: _id });
    const followingCount = await Follows.countDocuments({ follower: _id });

    // ✅ Profile completion calculation
    const profileFields = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "profileImage",
      "bannerImage",
    ];

    const filledFields = profileFields.filter(field => {
      const value = user[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== "";
    }).length;

    const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

    // ✅ Final response
    res.status(200).json({
      responseCode: 200,
      message: "User details fetched successfully",
      userDetails: {
        ...user,
        followersCount,
        followingCount,
        profileCompletion,
      },
    });

  } catch (error) {
    console.error("getUserById Error:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.getUserRestrictedById = async (req, res) => {
  try {
    const visitedUserId = req.params.userId;  // Profile being viewed
    const loggedInUserId = req.query.loggedInUserId; // Who is viewing

    // Fetch user details safely
    const user = await User.findById(visitedUserId)
      .select("-password -emailOtp -phoneOtp -resetPasswordToken -resetPasswordExpires")
      .lean();

    if (!user) {
      return res.status(404).json({ responseCode: 404, message: "User not found" });
    }

    // Followers count
    const followersCount = await Follows.countDocuments({ following: visitedUserId });

    // Following count
    const followingCount = await Follows.countDocuments({ follower: visitedUserId });

    // Check following status (IMPORTANT PART)
    let isFollowing = false;

    if (loggedInUserId && loggedInUserId !== visitedUserId) {
      const followDoc = await Follows.findOne({
        follower: loggedInUserId,
        following: visitedUserId
      });

      isFollowing = !!followDoc;
    }

    // Profile completion
    const profileFields = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "profileImage",
      "bannerImage",
    ];

    const filledFields = profileFields.filter(field => {
      const value = user[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && value !== "";
    }).length;

    const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

    // Response
    res.status(200).json({
      responseCode: 200,
      message: "User profile fetched",
      userDetails: {
        ...user,
        followersCount,
        followingCount,
        profileCompletion,
        isFollowing: isFollowing, // ⭐ Return follow status
      },
    });

  } catch (error) {
    console.error("getUserById Error:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};


// Update volunteer
exports.updateUser = async (req, res) => {
  try {
    console.log("gggggege", req.body
    )
    const { _id, ...updates } = req.body; // Extract ID and updates
    if (!_id) {
      return res.status(200).json({ responseCode: 400, message: "User ID is required" });
    }

    updates.updatedAt = Date.now(); // Update timestamp

    console.log("main")
    const updatedUser = await User.findByIdAndUpdate(_id, updates, {
      new: true, // Return updated document
      runValidators: true, // Ensure validation rules are applied
    });

    console.log(updatedUser)
    if (!updatedUser) {
      return res.status(200).json({ responseCode: 400, message: "User not found" });
    }

    res.status(200).json({
      responseCode: 200,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ responseCode: 500, message: "Server error", error: error.message });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(200).json({ responseCode: 400, message: "Email is required" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiry time: 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Find or create the user (depending on your flow)
    let user = await User.findOne({ email });

    if (!user) {
      // If no user yet (signup OTP)
      user = new User({ email, emailOtp: otp, otpExpiry });
    } else {
      // Update existing user OTP
      user.emailOtp = otp;
      user.otpExpiry = otpExpiry;
    }

    await user.save();

    // Send OTP via email
    const emailSent = await sendEmail(email, `Your OTP is: ${otp}`, otp);

    if (emailSent) {
      res.status(200).json({
        responseCode: 200,
        message: "OTP sent successfully",
      });
    } else {
      res.status(200).json({
        responseCode: 400,
        message: "Failed to send OTP",
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(200).json({ responseCode: 400, message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({ responseCode: 404, message: "User not found" });
    }

    // Get email from user record
    const email = user.email;

    if (!email) {
      return res.status(200).json({ responseCode: 400, message: "User doesn't have an email in database" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 5 min expiry
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Update DB
    user.emailOtp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    const emailSent = await sendEmail(email, `Your OTP is: ${otp}`, otp);

    if (emailSent) {
      return res.status(200).json({
        responseCode: 200,
        message: "OTP sent successfully",
      });
    } else {
      return res.status(200).json({
        responseCode: 400,
        message: "Failed to send OTP",
      });
    }

  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(200).json({ responseCode: 400, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ responseCode: 400, message: "User not found" });
    }

    // Check OTP validity
    if (user.emailOtp !== otp) {
      return res.status(200).json({ responseCode: 400, message: "Invalid OTP" });
    }

    // console.log(user.otpExpiry,new Date())
    // if (user.otpExpiry < new Date()) {
    //   return res.status(200).json({ responseCode: 400, message: "OTP expired" });
    // }

    // Mark verified
    user.emailVerified = true;
    user.emailOtp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({ responseCode: 200, message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.verifyOtpByUserId = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(200).json({
        responseCode: 400,
        message: "User ID and OTP are required",
      });
    }

    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(200).json({
        responseCode: 400,
        message: "User not found",
      });
    }

    // OTP mismatch
    if (user.emailOtp !== otp) {
      return res.status(200).json({
        responseCode: 400,
        message: "Invalid OTP",
      });
    }

    // OTP expired check
    if (user.otpExpiry && user.otpExpiry < new Date()) {
      return res.status(200).json({
        responseCode: 400,
        message: "OTP expired",
      });
    }

    // Mark verified
    user.emailVerified = true;
    user.emailOtp = null;
    user.otpExpiry = null;

    await user.save();

    res.status(200).json({
      responseCode: 200,
      message: "OTP verified successfully",
      userId: user._id,
    });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.userLogin = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    console.log("Login attempt:", emailOrPhone, password);

    let user;

    // Determine if input is an email or phone number
    if (emailOrPhone.includes("@")) {
      user = await User.findOne({ email: emailOrPhone });
    } else {
      // If phone number — we assume country code is optional
      user = await User.findOne({ "mobile.number": emailOrPhone });
    }

    if (!user) {
      return res.status(200).json({ responseCode: 400, message: "User not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(200).json({ responseCode: 400, message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Optionally store the token in DB
    user.token = token;
    await user.save();

    res.status(200).json({
      responseCode: 200,
      message: "Login successful",
      userId: user._id,
      token,
      profileImage: user.profileImage,
      profileName: user.profileName
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(200).json({ responseCode: 500, message: "Internal server error" });
  }
};

exports.userLoginById = async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;
    console.log(userId)

    if (!userId) {
      return res.status(200).json({
        responseCode: 400,
        message: "User ID is required",
      });
    }



    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(200).json({
        responseCode: 400,
        message: "User not found",
      });
    }

    const token = generateToken(user);
    return res.status(200).json({
      responseCode: 200,
      message: "Login successful",
      userId: user._id,
      token,
      profileImage: user.profileImage,
      profileName: user.profileName,
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(200).json({
      responseCode: 500,
      message: "Internal server error",
    });
  }
};

exports.changePassword = async (req, res) => {
  const _id = req.userId; // ✅ userId from verified JWT
  const { oldPassword, newPassword } = req.body;
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(200).json({ responseCode: 400, message: 'User not found' });

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(200).json({ responseCode: 400, message: 'Incorrect old password' });

    // Hash and update new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(200).json({ responseCode: 500, message: error.message });
  }
}
exports.emailVerified = async (req, res) => {
  const { mail } = req.body;
  try {


    const user = await User.findOne({ mail });

    if (!user) return res.status(200).json({ responseCode: 400, message: 'User not found' });


    // Hash new password and update


    res.status(200).json({ responseCode: 200, message: 'Email Exists' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.userGetByMail = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }).select("_id");

    if (!user) {
      return res.status(200).json({
        responseCode: 400,
        message: "User not found",
      });
    }

    return res.status(200).json({
      responseCode: 200,
      message: "Email exists",
      userId: user._id, // ✅ sending user id
    });

  } catch (error) {
    return res.status(500).json({
      responseCode: 500,
      message: "Server error",
      error: error.message,
    });
  }
};
exports.forgotPassword = async (req, res) => {
  const { userId, newPassword, confirmPassword } = req.body;

  try {
    if (newPassword !== confirmPassword) {
      return res.status(200).json({
        responseCode: 400,
        message: "Passwords do not match",
      });
    }

    const user = await User.findById(userId);

    // 🔐 VERY IMPORTANT: always check user exists
    if (!user) {
      return res.status(200).json({
        responseCode: 400,
        message: "User not found",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      responseCode: 200,
      message: "Password reset successfully",
    });

  } catch (error) {
    return res.status(200).json({
      responseCode: 500,
      message: error.message,
    });
  }
};
exports.updateUserPoints = async (userId, type) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    let pointsToAdd = 0;

    switch (type) {
      case "Like":
        pointsToAdd = 5;
        break;
      case "Comment":
        pointsToAdd = 10;
        break;
      case "Share":
        pointsToAdd = 15;
        break;
      case "Post":
        pointsToAdd = 20;
        break;
      case "Referral":
        pointsToAdd = 50;
        user.referralPoints += 50; // Extra referral points
        break;
    }

    user.points += pointsToAdd;

    // 🏆 Assign Badges Based on Followers
    if (user.followersCount >= 5000) {
      if (!user.badges.includes("Superstar")) user.badges.push("Superstar");
    } else if (user.followersCount >= 2000) {
      if (!user.badges.includes("Elite")) user.badges.push("Elite");
    } else if (user.followersCount >= 1500) {
      if (!user.badges.includes("Pro Creator")) user.badges.push("Pro Creator");
    } else if (user.followersCount >= 1000) {
      if (!user.badges.includes("Influencer")) user.badges.push("Influencer");
    } else if (user.followersCount >= 500) {
      if (!user.badges.includes("Popular")) user.badges.push("Popular");
    } else if (user.followersCount >= 100) {
      if (!user.badges.includes("Rising Star")) user.badges.push("Rising Star");
    }


    await user.save();
  } catch (error) {
    console.error("Error updating user points:", error);
  }
};
exports.updateSessionTime = async (req, res) => {
  try {
    const { userId, duration } = req.body; // Duration in seconds
    const user = await User.findById(userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    user.totalTimeSpent += Math.floor(duration / 60); // Convert to minutes
    user.lastActive = new Date();

    await user.save();

    res.status(200).json({ message: "Session time updated" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
exports.getFollowerSuggestions = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user details
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Find users with common followers
    const mutualFollowers = await User.find({
      _id: { $ne: userId }, // Exclude current user
      followers: { $in: user.followers }
    }).limit(10);

    // Find users with similar interests
    const interestBasedUsers = await User.find({
      _id: { $ne: userId },
      interests: { $in: user.interests }
    }).limit(10);

    // Find users from the same location
    const locationBasedUsers = await User.find({
      _id: { $ne: userId },
      currentCountry: user.currentCountry
    }).limit(10);

    // Combine and remove duplicates
    const suggestions = [...new Set([...mutualFollowers, ...interestBasedUsers, ...locationBasedUsers])];

    res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching follower suggestions" });
  }
};
exports.getNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query; // Radius in km
    if (!latitude || !longitude) return res.status(400).json({ success: false, message: "Location required" });

    const nearbyUsers = await User.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: radius * 1000, // Convert km to meters
        },
      },
    });

    res.status(200).json({ success: true, users: nearbyUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching nearby users" });
  }
};
exports.getFollowSuggestions = async (req, res) => {
  try {
    const { userId, limit = 5 } = req.query; // ✅ default limit = 5

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId required" });
    }

    const LIMIT = Number(limit);

    // 1️⃣ Users already followed by logged-in user
    const followingDocs = await Follows.find({ follower: userId })
      .select("following")
      .lean();

    const followingIds = followingDocs.map(doc => doc.following);

    // 2️⃣ Fetch suggested users
    const users = await User.find({
      _id: {
        $ne: userId,           // exclude self
        $nin: followingIds    // exclude already followed
      }
    })
      .select("_id profileName profileImage profession currentCountry")
      .limit(LIMIT)           // ✅ LIMIT APPLIED
      .lean();

    const userIds = users.map(u => u._id);

    // 3️⃣ Follower count aggregation
    const followerCounts = await Follows.aggregate([
      { $match: { following: { $in: userIds } } },
      {
        $group: {
          _id: "$following",
          count: { $sum: 1 }
        }
      }
    ]);

    const followerMap = {};
    followerCounts.forEach(f => {
      followerMap[f._id.toString()] = f.count;
    });

    // 4️⃣ Final response
    const suggestions = users.map(u => ({
      userId: u._id,
      name: u.profileName,
      image: u.profileImage || "",
      profession: u.profession || "",
      country: u.currentCountry || "",
      followersCount: followerMap[u._id.toString()] || 0,
      isFollowed: false
    }));

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      suggestions
    });

  } catch (error) {
    console.error("Suggestions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching follow suggestions",
      error: error.message
    });
  }
};
exports.saveDeviceToken = async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { deviceTokens: token }
    });

    res.json({ success: true });

  } catch (err) {
    console.log("Save Token Error:", err);
    res.status(500).json({ message: "Error saving token" });
  }
};
exports.removeDeviceToken = async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }
    await User.findByIdAndUpdate(userId, {
      $pull: { deviceTokens: token }
    });

    res.json({ success: true });

  } catch (err) {
    console.log("Save Token Error:", err);
    res.status(500).json({ message: "Error saving token" });
  }
};
exports.getAllUsers = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(200).json({
        success: false,
        message: "userId required"
      });
    }

    const PAGE = Number(page);
    const LIMIT = Number(limit);
    const SKIP = (PAGE - 1) * LIMIT;

    /* ======================================================
       1️⃣ USERS THAT LOGGED-IN USER FOLLOWS
    ======================================================= */
    const followingDocs = await Follows.find({ follower: userId })
      .select("following")
      .lean();

    const followingSet = new Set(
      followingDocs.map(f => f.following.toString())
    );

    /* ======================================================
       2️⃣ FETCH ALL USERS (EXCEPT SELF)
    ======================================================= */
    const users = await User.find({
      _id: { $ne: userId }
    })
      .select("_id profileName profileImage profession currentCountry nativeCountry")
      .skip(SKIP)
      .limit(LIMIT)
      .lean();

    const allUserIds = users.map(u => u._id);

    if (!allUserIds.length) {
      return res.json({
        success: true,
        page: PAGE,
        limit: LIMIT,
        count: 0,
        users: []
      });
    }

    /* ======================================================
       3️⃣ FOLLOWER COUNT FOR EACH USER
    ======================================================= */
    const followerCounts = await Follows.aggregate([
      { $match: { following: { $in: allUserIds } } },
      { $group: { _id: "$following", count: { $sum: 1 } } }
    ]);

    const followerMap = {};
    followerCounts.forEach(f => {
      followerMap[f._id.toString()] = f.count;
    });

    /* ======================================================
       4️⃣ FINAL UNIFIED USER LIST
    ======================================================= */
    const finalUsers = users.map(u => ({
      userId: u._id,
      name: u.profileName,
      image: u.profileImage || "",
      profession: u.profession || "",
      cureentCountry: u.currentCountry || "",
      nativeCountry: u.nativeCountry || "",
      followersCount: followerMap[u._id.toString()] || 0,
      isFollowed: followingSet.has(u._id.toString())  // true or false
    }));

    return res.json({
      success: true,
      page: PAGE,
      limit: LIMIT,
      count: finalUsers.length,
      users: finalUsers
    });

  } catch (error) {
    console.error("ALL USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user list",
      error: error.message
    });
  }
};

exports.deactivateUser = async (req, res) => {
  try {

    const { userId } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isDeactivated: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: user
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deactivating user",
      error
    });

  }
};

exports.activateUser = async (req, res) => {
  try {

    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User activated successfully",
      data: user
    });

  } catch (error) {

    res.status(500).json({
      message: "Error activating user",
      error
    });

  }
};

exports.deleteUser = async (req, res) => {
  try {

    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // delete user posts
    await Post.deleteMany({ userId });

    // delete group memberships
    await GroupMember.deleteMany({ userId });

    // delete comments
    await Comment.deleteMany({ userId });

    // delete notifications
    await Notification.deleteMany({ userId });

    // delete user
    await User.findByIdAndDelete(userId);
    res.status(200).json({
      success: true,
      message: "User and related data deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: "Error deleting user",
      error
    });

  }
};