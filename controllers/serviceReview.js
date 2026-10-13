const mongoose = require("mongoose");
const Service = require("../models/service");
const ServiceReview = require("../models/serviceReview");

const parsePositiveInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const buildRatingSummary = async (serviceId) => {
  const result = await ServiceReview.aggregate([
    {
      $match: {
        serviceId: new mongoose.Types.ObjectId(serviceId),
        status: "active",
      },
    },
    {
      $group: {
        _id: "$serviceId",
        totalReviews: { $sum: 1 },
        avgRating: { $avg: "$rating" },
        r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  const row = result?.[0];
  const total = row?.totalReviews || 0;
  const avg = total ? Number((row.avgRating || 0).toFixed(1)) : 0;

  const dist = {
    5: row?.r5 || 0,
    4: row?.r4 || 0,
    3: row?.r3 || 0,
    2: row?.r2 || 0,
    1: row?.r1 || 0,
  };

  const percent = (count) => (total ? Math.round((count / total) * 100) : 0);

  return {
    averageRating: avg,
    totalReviews: total,
    distribution: {
      5: { count: dist[5], percent: percent(dist[5]) },
      4: { count: dist[4], percent: percent(dist[4]) },
      3: { count: dist[3], percent: percent(dist[3]) },
      2: { count: dist[2], percent: percent(dist[2]) },
      1: { count: dist[1], percent: percent(dist[1]) },
    },
  };
};

exports.createOrUpdateServiceReview = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.userId;

    const { rating, review, images } = req.body;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId" });
    }

    const serviceExists = await Service.exists({ _id: serviceId });
    if (!serviceExists) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const parsedRating = Number(rating);
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];

    const doc = await ServiceReview.findOneAndUpdate(
      { serviceId, userId, status: "active" },
      {
        $set: {
          rating: parsedRating,
          review: typeof review === "string" ? review : "",
          images: safeImages,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate("userId", "profileName profileImage")
      .lean();

    const summary = await buildRatingSummary(serviceId);

    return res.status(200).json({
      success: true,
      message: "Review submitted successfully",
      review: {
        _id: doc._id,
        serviceId: doc.serviceId,
        rating: doc.rating,
        review: doc.review,
        images: doc.images || [],
        isVerified: !!doc.isVerified,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        user: doc.userId
          ? {
              _id: doc.userId._id,
              profileName: doc.userId.profileName || "",
              profileImage: doc.userId.profileImage || "",
            }
          : null,
      },
      summary,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "You already reviewed this service" });
    }

    console.error("CREATE/UPDATE SERVICE REVIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

exports.getServiceReviews = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId" });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ServiceReview.find({ serviceId, status: "active" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "profileName profileImage")
        .lean(),
      ServiceReview.countDocuments({ serviceId, status: "active" }),
    ]);

    const reviews = (items || []).map((doc) => ({
      _id: doc._id,
      serviceId: doc.serviceId,
      rating: doc.rating,
      review: doc.review,
      images: doc.images || [],
      isVerified: !!doc.isVerified,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      user: doc.userId
        ? {
            _id: doc.userId._id,
            profileName: doc.userId.profileName || "",
            profileImage: doc.userId.profileImage || "",
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      reviews,
    });
  } catch (error) {
    console.error("GET SERVICE REVIEWS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
  }
};

exports.getServiceReviewSummary = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId" });
    }

    const serviceExists = await Service.exists({ _id: serviceId });
    if (!serviceExists) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const summary = await buildRatingSummary(serviceId);

    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("GET SERVICE REVIEW SUMMARY ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch rating summary" });
  }
};

exports.deleteMyServiceReview = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid serviceId" });
    }

    const deleted = await ServiceReview.findOneAndUpdate(
      { serviceId, userId, status: "active" },
      { $set: { status: "deleted" } },
      { new: true }
    ).lean();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const summary = await buildRatingSummary(serviceId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      summary,
    });
  } catch (error) {
    console.error("DELETE SERVICE REVIEW ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};
