const express = require('express');
const { userRegister, updateUser, userChangePassword, userForgotPassword, userLogin, getUserById, sendOtp, verifyOtp, forgotPassword, changePassword, verifyOtpByUserId, resendOtp, getFollowSuggestions, getUserRestrictedById, userLoginById, userGetByMail, saveDeviceToken, getAllUsers, deleteUser, deactivateUser, removeDeviceToken } = require('../controllers/user');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
router.post("/register",userRegister)
router.post("/login",userLogin)
router.post("/loginById",userLoginById)
router.put("/update",updateUser)
router.post("/change_password",verifyToken,changePassword)
router.post("/forgot_password",forgotPassword)
router.post("/mailByDetails",userGetByMail)
router.post("/sendOtp",sendOtp)
router.post("/resendOtp",resendOtp)
router.post("/verifyOtp",verifyOtp)
router.post("/verifyOtpById",verifyOtpByUserId)
router.get("/details/:userId",getUserById)
router.get("/visit/:userId",getUserRestrictedById)
router.get("/suggestions",getFollowSuggestions)
router.post("/save-device-token",saveDeviceToken)
router.post("/remove-device-token",removeDeviceToken)

router.get("/getUsers",getAllUsers)
router.post("/delete",deleteUser)
router.post("/deactivate",deactivateUser)

module.exports = router;
