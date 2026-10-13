const express = require('express');
const {
  registerStep1,
  registerStep2,
  registerStep3,
  getServiceProfile,
  getUserServices,
  verifyOtp,
  sendOtp,
  updateService,
  getCategoryWiseProfiles,
  deleteServicePermanently,
  registerService,
  getAllServices,
  getAdminAllServices,
  subadminReviewService,
  agentReviewService,
  
} =require("../controllers/service");
const { createCategory, getCategoriesWithSubs, createCategories, seedSubCategories } = require('../controllers/serviceCategories');
const { createSubCategory } = require('../controllers/serviceSubCategories');

const router = express.Router();

router.post("/service/step1", registerService);
// router.put("/service/step2/:serviceId", registerStep2);
// router.put("/service/step3/:serviceId", registerStep3);
router.get("/services", getCategoryWiseProfiles);
router.get("/services/:userId",getUserServices)
router.get("/user/service/all",getAllServices)
router.get("/admin/service/all",getAdminAllServices)
router.get("/service/:serviceId", getServiceProfile);
router.post("/service/sendOtp", sendOtp);
router.post("/service/verifyOtp", verifyOtp);
router.put("/service/update/:serviceId", updateService);
router.post("/service/createCategory",createCategory)
router.get("/service/categories/subCategories",getCategoriesWithSubs)
router.get("/c",seedSubCategories)
router.post("/service/createSubCategory",createSubCategory)
router.delete("/deleteServcie/:serviceId",deleteServicePermanently)
router.post("/agent/review/:serviceId", agentReviewService );
router.post("/admin/review/:serviceId", subadminReviewService);

module.exports = router;