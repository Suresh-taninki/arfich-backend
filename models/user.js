const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC PROFILE ================= */
    bannerImage: String,
    profileImage: String,

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profileName: String,

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mobile: {
      countryCode: { type: String, required: true, trim: true },
      number: { type: String, required: true, trim: true, unique: true },
    },

    password: { type: String, required: true },
    dob: String,
    gender: { type: String, enum: ["male", "female", "other"] },
    nativeCountry: { name: String, flag: String },
    currentCountry: { name: String, flag: String },

    bio: String,
    profession: String,
   interests: [
  {
    name: { type: String, required: true },
    logo: { type: String }, // URL (Cloudinary / SVG / PNG)
  }
],

languages: [
  {
    name: { type: String, required: true },
    logo: { type: String }, // flag / icon URL
  }
],

    /* ================= VERIFICATION ================= */
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    emailOtp: String,
    phoneOtp: String,
    otpExpiry: Date,

    /* ================= REFERRAL SYSTEM ================= */
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    referralStats: {
      totalReferrals: { type: Number, default: 0 },
      referralPointsEarned: { type: Number, default: 0 }, // 1% earnings
    },

    /* ================= LOYALTY POINTS (HXP) ================= */
    

    /* ================= PROFILE LEVEL SYSTEM ================= */
   points: { type: Number, default: 1000 },
lifetimePointsEarned: { type: Number, default: 1000 },

profileLevel: {
  level: { type: String, default: "L1" },
  multiplier: { type: Number, default: 1 },
  badge: { type: String, default: "1x" },
},

followersCount: { type: Number, default: 0 },
followersRewardedAt: { type: [Number], default: [] },

referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
referralStats: {
  totalReferrals: { type: Number, default: 0 },
  referralPointsEarned: { type: Number, default: 0 },
},

// survival
dailyActiveMinutes: { type: Number, default: 0 },
lastActiveDate: Date,
activeStreak: { type: Number, default: 0 },
totalActiveDays: { type: Number, default: 0 },
    /* ================= USER TYPE ================= */
    isPremium: { type: Boolean, default: true }, // Everyone is premium now
    premiumExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },

    role: {
      type: String,
      enum: ["User", "Service", "User_Service"],
      default: "User",
    },

    /* ================= ACTIVITY & ENGAGEMENT ================= */
    totalTimeSpent: { type: Number, default: 0 }, // minutes
    lastActive: { type: Date, default: null },

    badges: [String],

    /* ================= LOCATION ================= */
    location: {
  city: { type: String },
  state: { type: String },
  country: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
}
,
    /* ================= SECURITY ================= */
    deviceTokens: [String],
    lastLoginIP: String,
    lastLoginDevice: String,

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    isSuspended: { type: Boolean, default: false },
    isDeactivated: { type: Boolean, default: false },
       idDeleted:
      { type: Boolean, default: false },
  
  },
  { timestamps: true }
);


module.exports = mongoose.model("User", userSchema);
