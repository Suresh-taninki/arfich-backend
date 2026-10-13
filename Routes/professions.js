const express = require('express');
const { getProfessions, createProfession, bulkCreateProfessions } = require('../controllers/professions');
const router = express.Router();

router.get("/all", getProfessions);
router.post("/add", createProfession);

module.exports = router;
