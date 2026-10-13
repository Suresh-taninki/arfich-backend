const mongoose = require("mongoose");

const professionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
    },

   
    isActive: {
      type: Boolean,
      default: true,
    },

  },
);

module.exports = mongoose.model("Profession", professionSchema);