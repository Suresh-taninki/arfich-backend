const express = require("express");
const {
  createOrUpdateServiceReview,
  getServiceReviews,
  getServiceReviewSummary,
  deleteMyServiceReview,
} = require("../controllers/serviceReview");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/service/:serviceId/review", verifyToken, createOrUpdateServiceReview);
router.delete("/service/:serviceId/review", verifyToken, deleteMyServiceReview);
router.get("/service/:serviceId/reviews", getServiceReviews);
router.get("/service/:serviceId/reviews/summary", getServiceReviewSummary);

module.exports = router;
