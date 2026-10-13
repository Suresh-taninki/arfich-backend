const express = require('express');
const { getAllLanguage, addLanguage, editLanguage, deleteLanguage, addMultipleLanguages } = require('../controllers/language');
const router = express.Router();

router.get("/all", getAllLanguage);
router.post("/add", addLanguage);
router.put("/update/:id",editLanguage)
router.delete("/delete/:id",deleteLanguage)
// router.get("/addall",addMultipleLanguages)

module.exports = router;
