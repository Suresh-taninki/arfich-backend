const express = require('express');
const {  registerAgent, loginAgent, getAllAgents } = require('../controllers/agents');
const router = express.Router();

router.get("/all", getAllAgents);
router.post("/add", registerAgent);
router.post("/login",loginAgent)
// router.get("/addall",addMultipleLanguages)

module.exports = router;
