const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinaryConfig");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "hloxpat-app",
    upload_preset: "hloxpat_unsigned"
  },
});

const upload = multer({ storage });

module.exports = upload;
