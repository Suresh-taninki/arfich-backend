const express = require("express");
const upload = require("../middleware/upload");
const router = express.Router();

router.post("/upload", upload.single("image"), (req, res) => {
    console.log("FILE RECEIVED:", req.file);
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image received — check key name in form-data",
      });
    }
    res.json({
      success: true,
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
