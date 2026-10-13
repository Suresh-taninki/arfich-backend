const mongoose = require("mongoose");

const LanguageSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    description:
        { type: String
    },
    image:{
        type:String,
    }
}, { timestamps: true });

module.exports = mongoose.model("Language", LanguageSchema);
