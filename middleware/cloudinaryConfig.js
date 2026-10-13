const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dsdx2cjkb",
  api_key: "292773489298868",
  api_secret: "M3cRV5tLZ7a3FloeUZ_uVLiVCjo",
  secure: true,
});

module.exports = cloudinary;
