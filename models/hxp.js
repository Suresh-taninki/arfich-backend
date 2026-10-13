const mongoose = require("mongoose");

const hxpTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String,
  points: Number,
  sourceId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model("hxp", hxpTransactionSchema);
