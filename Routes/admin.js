const express = require('express');
const { loginAdmin, createAdmin } = require('../controllers/admin');
const router = express.Router();

router.post("/add", createAdmin);
router.post("/login",loginAdmin)
// router.get("/addall",addMultipleLanguages)

module.exports = router;
