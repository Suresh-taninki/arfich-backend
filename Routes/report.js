const express = require('express');
const { reportContent } = require('../controllers/report');
const { BlockUser } = require('../controllers/blockedUser');
const router = express.Router();
router.post("/reportPost",reportContent);
router.post("/blockedUser",BlockUser);

module.exports = router;
