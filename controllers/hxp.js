const mongoose = require("mongoose");
const User = require("../models/user");
const HXP = require("../models/hxp");
const RULES = require("../config");

async function awardPoints({ userId, type, sourceId, points }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Prevent duplicate reward
    const exists = await HXP.findOne({ userId, type, sourceId }).session(session);
    if (exists) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const multiplier = user.profileLevel?.multiplier || 1;
    const finalPoints = Math.floor(points * multiplier);

    /* ===== DAILY CAP CHECK ===== */
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayTotal = await HXP.aggregate([
      { $match: { userId: user._id, createdAt: { $gte: startOfDay } } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);

    const usedToday = todayTotal[0]?.total || 0;
    if (usedToday + finalPoints > RULES.DAILY_CAP) {
      await session.abortTransaction();
      session.endSession();
      return;
    }

    await HXP.create(
      [{ userId, type, points: finalPoints, sourceId }],
      { session }
    );

    user.points += finalPoints;
    user.lifetimePointsEarned += finalPoints;
    await user.save({ session });
    
    if (user.referredBy) {
      const bonus = Math.floor(finalPoints * 0.01);
      if (bonus > 0) {
        const referrer = await User.findById(user.referredBy).session(session);
        if (referrer) {
          await HXP.create(
            [{
              userId: referrer._id,
              type: "REFERRAL_EARNING",
              points: bonus,
              sourceId: user._id,
            }],
            { session }
          );

          referrer.points += bonus;
          referrer.referralStats.referralPointsEarned += bonus;
          await referrer.save({ session });
        }
      }
    }

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("awardPoints error:", err);
  }
}

async function handleFollowerMilestones(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  for (const rule of RULES.FOLLOWER_MILESTONES) {
    if (
      user.followersCount >= rule.count &&
      !user.followersRewardedAt.includes(rule.count)
    ) {
      await awardPoints({
        userId: user._id,
        type: "FOLLOWER_MILESTONE",
        sourceId: user._id,
        points: rule.points,
      });

      user.followersRewardedAt.push(rule.count);
    }
  }

  await user.save();
}

async function dailyActiveReward(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  if (user.dailyActiveMinutes >= 10) {
    await awardPoints({
      userId: user._id,
      type: "DAILY_ACTIVE",
      sourceId: user._id,
      points: RULES.DAILY_ACTIVE,
    });

    user.dailyActiveMinutes = 0;
    user.totalActiveDays += 1;
    await user.save();
  }
}

async function handleStreaks(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  if (user.activeStreak === 7) {
    await awardPoints({
      userId: user._id,
      type: "WEEKLY_STREAK",
      sourceId: user._id,
      points: RULES.WEEKLY_STREAK,
    });
    user.activeStreak = 0;
  }

  if (user.totalActiveDays === 30) {
    await awardPoints({
      userId: user._id,
      type: "MONTHLY_LOYALTY",
      sourceId: user._id,
      points: RULES.MONTHLY_LOYALTY,
    });
  }

  await user.save();
}

module.exports = {
  awardPoints,
  handleFollowerMilestones,
  dailyActiveReward,
  handleStreaks,
};
