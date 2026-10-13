const express = require('express');
const { loginSubadmin, registerSubadmin, getAllSubadmins } = require('../controllers/sudadmin');
const router = express.Router();

router.get("/all", getAllSubadmins);
router.post("/add", registerSubadmin);
router.post("/login",loginSubadmin)
// router.get("/addall",addMultipleLanguages)

module.exports = router;
