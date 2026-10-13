const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    serviceUniqueId:{
      type:String
    },

    // Step 1
    logo: String,
    banners: [String],
    brandName: { type: String, required: true },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "serviceCategory",
      required: true,
    },

    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "serviceSubCategory",
      }
    ],


    serviceDescription: String,
    country: String,
    city: String,
    addressLine: String,
    state: String,
    zipcode: String,
    status: {
      type: Boolean, default: false
    }
    ,
    // Step 2
    idProofType: String,
    idProofFile: String,
    mobile: {
      countryCode: {
        type: String,
      },
      number: {
        type: String,
      },
    },
    businessEmail: String,
    businessMobile: {
      countryCode: {
        type: String,
      },
      number: {
        type: String,
      },
    },
    email: String,
    // ⚠️ Remove email from here
    // Instead: take user's email from User model
    // Step 3
    serviceProofType: String,
    serviceProofFile: String,
    experience: String,
    availability: String,
    extraDocument: String,
    additionalDescription: String,
    declarations: {
      confirmInfo: Boolean,
      agreeTerms: Boolean,
    },
    otp: String,
    mailVerfied: { type: Boolean, default: false },
    isVerfied: { type: Boolean, default: false },
    idDeleted:
      { type: Boolean, default: false },
    isDeactivate: {
      type: Boolean, default: false
    },


agentReview: {
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "hidden", "deleted", "rereview"],
    default: "pending",
  },
  comment: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Agent",
  },
  reviewedAt: Date,
},

subadminReview: {
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "rereview"],
    default: "pending",
  },
  comment: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subadmin",
  },
  reviewedAt: Date,
},

finalStatus: {
  type: String,
  enum: ["pending", "approved", "rejected", "hidden", "deleted", "rereview"],
  default: "pending",
},

  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
