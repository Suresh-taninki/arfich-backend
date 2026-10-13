const express = require('express');
const { getAllInterests, addInterest, editInterest, deleteInterest, addMultipleInterests } = require('../controllers/interest');
const router = express.Router();


router.get("/all", getAllInterests);
router.post("/add", addInterest);
router.put("/update/:id",editInterest)
router.put("/delete/:id",deleteInterest)
// router.get("/addall",addMultipleInterests)

module.exports = router;
