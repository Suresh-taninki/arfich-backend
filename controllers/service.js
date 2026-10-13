const sendEmail = require("../middleware/mailSender");
const Service=require("../models/service")
const User=require("../models/service")
const Category = require("../models/serviceCategories");

// exports.registerStep1 = async (req, res) => {
//   const data=req.body
//  try {
//   const service = await Service.create({
//     userId: data.userId,
//     logo: data.logo,
//     banners: data.banners,
//     brandName: data.brandName,
//     category: data.category,
//     subCategories: data.subCategories,
//     serviceDescription: data.serviceDescription,
//     country: data.country,
//     city: data.city?.trim(),
//     state:data.state,
//     addressLine: data.addressLine,
//     zipcode: data.zipcode || "",
//   });

//   console.log("SERVICE CREATED:", service);
//   return res.status(201).json({ success: true, service });

// } catch (error) {
//   console.error("SERVICE CREATE ERROR:", error);
//   return res.status(500).json({
//     success: false,
//     message: error.message,
//   });
// }

// };
// exports.registerStep2 = async (req, res) => {
//   try {
//     const { serviceId } = req.params;
//     const { idProofType, idProofFile,email,mobile} = req.body;
//     console.log(req.body)
//     // Find the service
//      const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

//     const service = await Service.findById(serviceId);
//     if (!service) {
//       return res.status(404).json({ success: false, message: "Service not found" });
//     }

   
//     // Update Step 2 data
//     service.idProofType = idProofType;
//     service.idProofFile = idProofFile;
//     service.email=email;
//     service.mobile=mobile;
//     service.otp=otp

//     // Not stored in DB, just used for sending OTP
//     let targetEmail = email;
//     await service.save();
//     await sendEmail(email,"Add Service OTP", `Your OTP is: ${otp}`);
//     res.json({
//       success: true,
//       message: "Step 2 updated successfully",
//       email: targetEmail,
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// exports.registerStep3 = async (req, res) => {
//   try {
//     const { serviceId } = req.params;
//     const {
//       serviceProofType,
//       serviceProofFile,
//       experience,
//       availability,
//       extraDocument,
//       additionalDescription,
//       confirmInfo,
//       agreeTerms,
//       businessEmail,
//       businessMobile,
//     } = req.body;

//     let service = await Service.findById(serviceId);
//     if (!service) {
//       return res.status(404).json({ success: false, message: "Service not found" });
//     }

//     service.serviceProofType = serviceProofType;
//     service.serviceProofFile = serviceProofFile;
//     service.experience = experience;
//     service.availability = availability;
//     service.extraDocument = extraDocument;
//     service.additionalDescription = additionalDescription;
//     service.businessEmail=businessEmail,
//     service.businessMobile=businessMobile,
//     service.declarations = { confirmInfo, agreeTerms };

//     await service.save();

//     res.json({ success: true, message: "Step 3 completed" });
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


exports.registerService = async (req, res) => {
  try {
    const data = req.body;
    console.log(data)

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // ✅ FIND LAST SERVICE WITH ID

const lastService = await Service.findOne({
  serviceUniqueId: { $exists: true, $ne: "" },
})
  .sort({ createdAt: -1 })
  .select("serviceUniqueId");

let nextNumber = 1001;

// ✅ IF EXISTING ID FOUND
if (lastService?.serviceUniqueId) {

  const lastNumber = parseInt(
    lastService.serviceUniqueId.replace("SRV", "")
  );

  if (!isNaN(lastNumber)) {
    nextNumber = lastNumber + 1;
  }
}

// ✅ NEW ID
const serviceUniqueId = `SRV${nextNumber}`;

    const service = await Service.create({
      // STEP 1
      userId: data.userId,
      serviceUniqueId,
      logo: data.logo,
      banners: data.banners,
      brandName: data.brandName,
      category: data.category,
      subCategories: data.subCategories,
      serviceDescription: data.serviceDescription,
      country: data.country,
      city: data.city?.trim(),
      state: data.state,
      addressLine: data.addressLine,
      zipcode: data.zipcode || "",

      // STEP 2
      idProofType: data.idProofType,
      idProofFile: data.idProofFile,
      email: data.email,
      mobile: data.mobile,
      otp: otp,
      otpExpiry: otpExpiry,

      // STEP 3
      serviceProofType: data.serviceProofType,
      serviceProofFile: data.serviceProofFile,
      experience: data.experience,
      availability: data.availability,
      extraDocument: data.extraDocument,
      additionalDescription: data.additionalDescription,
      businessEmail: data.businessEmail,
      businessMobile: data.businessMobile,
      declarations: {
        confirmInfo: data.confirmInfo,
        agreeTerms: data.agreeTerms,
      },
    });

    // Send OTP email
    if (data.email) {
      await sendEmail(data.email, "Add Service OTP", `Your OTP is: ${otp}`);
    }

    res.status(201).json({
      success: true,
      message: "Service registered successfully",
      service,
    });

  } catch (error) {
    console.error("REGISTER SERVICE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.getAdminAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .sort({ createdAt: -1 })

      // ✅ USER
      .populate(
        "userId",
        "profileName profileImage profession email mobile"
      )

      // ✅ CATEGORY
      .populate("category", "title icon")

      // ✅ SUB CATEGORY
      .populate("subCategories", "name")

      // ✅ AGENT REVIEW USER
      .populate(
        "agentReview.reviewedBy",
        "name email mobile phone"
      )

      // ✅ SUBADMIN REVIEW USER
      .populate(
        "subadminReview.reviewedBy",
        "name email mobile phone"
      )

      .lean();

    const formattedServices = services.map((s) => {

      // ✅ BASE STATUS
      let baseStatus = "In Review";

      if (s.idDeleted) baseStatus = "Deleted";
      else if (s.isDeactivate) baseStatus = "Hidden";
      else if (s.isVerfied) baseStatus = "Verified";
      else if (s.status === true) baseStatus = "Verified";
      else if (s.status === false) baseStatus = "In Review";

      return {
        serviceId: s._id,

        // ✅ SERVICE
        serviceName:
          s.brandName?.trim() ||
          s.serviceName ||
          "—",

        description:
          s.serviceDescription || "",
          serviceId:s.serviceUniqueId,

        // ✅ USER
        userName:
          s.userId?.profileName ||
          s.userId?.name ||
          "—",

        userEmail:
          s.userId?.email ||
          s.businessEmail ||
          s.email ||
          "—",

        userMobile:
          s.userId?.mobile?.number ||
          s.mobile?.number ||
          s.businessMobile?.number ||
          "",

        userImage:
          s.userId?.profileImage || "",

        // ✅ CATEGORY
        category:
          s.category?.title ||
          s.category?.name ||
          "—",

        // ✅ STATUS
        status: baseStatus,

        // =================================================
        // ✅ AGENT REVIEW
        // =================================================

        agentStatus:
          s.agentReview?.status || "pending",

        agentComment:
          s.agentReview?.comment || "",

        agentReviewedAt:
          s.agentReview?.reviewedAt || null,

        // ✅ AGENT DETAILS
        agentName:
          s.agentReview?.reviewedBy?.name || "—",

        agentEmail:
          s.agentReview?.reviewedBy?.email || "—",

        agentPhone:
          s.agentReview?.reviewedBy?.mobile?.number ||
          s.agentReview?.reviewedBy?.phone ||
          "—",

        // =================================================
        // ✅ SUBADMIN REVIEW
        // =================================================

        subadminStatus:
          s.subadminReview?.status || "pending",

        subadminComment:
          s.subadminReview?.comment || "",

        subadminReviewedAt:
          s.subadminReview?.reviewedAt || null,

        // ✅ SUBADMIN DETAILS
        subadminName:
          s.subadminReview?.reviewedBy?.name || "—",

        subadminEmail:
          s.subadminReview?.reviewedBy?.email || "—",

        subadminPhone:
          s.subadminReview?.reviewedBy?.mobile?.number ||
          s.subadminReview?.reviewedBy?.phone ||
          "—",

        // =================================================
        // ✅ FINAL STATUS
        // =================================================

        finalStatus:
          s.finalStatus || "pending",

        // ✅ DATES
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,

        // ✅ LOCATION
        country: s.country || "",
        state: s.state || "",
        city: s.city || "",
        address: s.addressLine || "",
        zipcode: s.zipcode || "",

        // ✅ BUSINESS
        businessEmail:
          s.businessEmail || "",

        businessMobile:
          s.businessMobile?.number || "",

        // ✅ DETAILS
        experience:
          s.experience || "",

        availability:
          s.availability || "",

        // ✅ MEDIA
        logo: s.logo || "",

        banners: Array.isArray(s.banners)
          ? s.banners
          : [],

        // ✅ DOCUMENTS
        idProofFile:
          s.idProofFile || "",

        serviceProofFile:
          s.serviceProofFile || "",

        extraDocument:
          s.extraDocument || "",

        // ✅ SUB CATEGORIES
        subCategories:
          s.subCategories
            ?.map((sub) => sub?.name)
            .filter(Boolean) || [],
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedServices.length,
      services: formattedServices,
    });

  } catch (error) {

    console.error(
      "GET ADMIN SERVICES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
    });
  }
};
exports.sendOtp = async (req, res) => {
  try {
    const { serviceId } = req.body;

    const service = await Service.findById(serviceId);
    if (!service)
      return res.status(404).json({ success: false, message: "Service not found" });

    const user = await User.findById(service.userId);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    service.otp = otp;
    await service.save();

    // send OTP to user's email
    sendEmail(service.email, "Your OTP Code", `Your verification OTP is: ${otp}`);
    res.json({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { serviceId, otp } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    if (service.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    service.mailVerfied = true;
    service.otp = null;
    await service.save();

    res.json({ success: true, message: "Service verified successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// controllers/service.controller.js
// exports.getAllServices = async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;

//     const skip = (Number(page) - 1) * Number(limit);

//     // ❌ NO search query
//     const services = await Service.find()
//       .select(
//         "brandName logo selectedService country banners city experience availability isVerfied subCategories"
//       )
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit))
//       .lean();

//     const total = await Service.countDocuments();

//     return res.status(200).json({
//       success: true,
//       data: services,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         total,
//         hasMore: skip + services.length < total,
//       },
//     });
//   } catch (error) {
//     console.error("GET ALL SERVICES ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch services",
//     });
//   }
// };

exports.getCategoryWiseProfiles = async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "category",
          as: "profiles",
        },
      }
    ]);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// controllers/serviceController.js
exports.getServiceProfile = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId)
      .populate("userId", "profileName profileImage profession currentCountry businessEmail businessMobile email mobile")
      .populate("category", "title icon")
      .populate("subCategories", "name")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const safe = (value) => value || "";

    return res.status(200).json({
      success: true,
      service: {
        _id: service._id,

        // 🔹 Basic Details
        brandName: safe(service.brandName),
        logo: safe(service.logo),
        banners: service.banners || [],

        category: service.category
          ? {
              id: service.category._id,
              title: service.category.title,
              icon: service.category.icon,
            }
          : null,

        subCategories:
          service.subCategories?.map((sub) => ({
            id: sub._id,
            name: sub.name,
          })) || [],

        businessEmail: safe(service.businessEmail),
        businessMobile: service.businessMobile || {},

        // 🔹 Description & Experience
        description: safe(service.serviceDescription),
        experience: safe(service.experience),
        availability: safe(service.availability),

        // 🔹 Location
        country: safe(service.country),
        city: safe(service.city),
        state: safe(service.state),
        zipcode: safe(service.zipcode),
        addressLine: safe(service.addressLine),
        location: `${safe(service.city)}, ${safe(service.country)}`,

        // 🔹 Verification
        isVerified: service.isVerfied || false,
        mailVerified: service.mailVerfied || false,
        serviceProofFile: safe(service.serviceProofFile),
        idProofFile: safe(service.idProofFile),

        // 🔹 Contact
        contact: {
          email: safe(service.email),
          phone: service.mobile?.number || "",
          countryCode: service.mobile?.countryCode || "",
        },

        // 🔹 Owner Info
        owner: {
          id: service.userId?._id || "",
          name: service.userId?.profileName || "",
          image: service.userId?.profileImage || "",
          profession: service.userId?.profession || "",
          currentCountry: service.userId?.currentCountry || "",
          email: service.userId?.email || "",
          mobile: service.userId?.mobile?.number || "",
        },

        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      },
    });
  } catch (error) {
    console.error("SERVICE PROFILE ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service profile",
    });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId)
      .populate("userId", "profileName profileImage email")
      .populate("category", "title icon")
      .populate("subCategories", "name")
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("GET SERVICE BY ID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service",
    });
  }
};

exports.getUserServices = async (req, res) => {
  try {
    const { userId } = req.params;

    const services = await Service.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error("GET USER SERVICES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user services",
    });
  }
};
exports.getAllServices = async (req, res) => {
  console.log("kjnkhjn")
  try {

    const services = await Service.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error("GET USER SERVICES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user services",
    });
  }
};
exports.getVerifiedServices = async (req, res) => {
  try {
    const services = await Service.find({ isVerfied: true })
      .select("brandName logo selectedService country city experience")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("GET VERIFIED SERVICES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch verified services",
    });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "serviceId is required",
      });
    }

    // Fields allowed to update
    const allowedFields = [
      "logo",
      "banners",
      "brandName",
      "selectedService",
      "selectedParentCategory",
      "subCategories",
      "serviceDescription",
      "country",
      "state",
      "city",
      "addressLine",
      "zipcode",
      "email",
      "availability",
      "experience",
      "serviceProofFile",
      "serviceProofType",
      "businessEmail",
      "extraDocument",
      "idProofFile"
    ];

    let updateData = {};

    // Copy only allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle nested mobile update
    if (req.body.mobile) {
      updateData.mobile = {
        countryCode: req.body.mobile.countryCode,
        number: req.body.mobile.number,
      };
    }

    if (req.body.businessMobile) {
      updateData.businessMobile = {
        countryCode: req.body.businessMobile.countryCode,
        number: req.body.businessMobile.number,
      };
    }

    updateData.updatedAt = new Date();

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
    });

  } catch (error) {
    console.error("Update Service Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating service",
      error: error.message,
    });
  }
};



exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { userId } = req.body; // optional ownership check

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "serviceId is required",
      });
    }

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // 🔐 Optional: Check owner
    // if (userId && service.userId.toString() !== userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to delete this service",
    //   });
    // }

    service.status = true;
    service.updatedAt = new Date();
    await service.save();

    return res.status(200).json({
      success: true,
      message: "Service deactivated successfully",
    });

  } catch (error) {
    console.error("Delete Service Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting service",
      error: error.message,
    });
  }
};

exports.deleteServicePermanently = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const deleted = await Service.findByIdAndDelete(serviceId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service permanently deleted",
    });

  } catch (error) {
    console.error("Hard Delete Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting service",
      error: error.message,
    });
  }
};


// controllers/agentController.js


exports.agentReviewService = async (req, res) => {
  console.log("agent1",req.params.serviceId,req.body.status,req.body.comment,req.body.reviewedBy)
  try {
    const { serviceId } = req.params;
    const { status, comment, reviewedBy} = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    service.agentReview = {
      status,
      comment,
      reviewedBy: reviewedBy, // 👈 agent login
      reviewedAt: new Date(),
    };

    await service.save();

    res.json({ success: true, message: "Agent review done" });
  } catch (err) {
    res.status(500).json({ message: "Error in agent review" });
  }
};

// controllers/subadminController.js


exports.subadminReviewService = async (req, res) => {
  try {
      console.log("agent2")

    const { serviceId } = req.params;
    const { status, comment ,reviewedBy} = req.body;

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    // ✅ CURRENT AGENT STATUS
    const agentStatus = service?.agentReview?.status;

    // ✅ PREVIOUS FINAL STATUS
    const previousFinalStatus = service?.finalStatus || "pending";

    // ✅ SAVE SUBADMIN REVIEW
    service.subadminReview = {
      status,
      comment,
      reviewedBy: reviewedBy,
      reviewedAt: new Date(),
    };

    let finalStatus = previousFinalStatus;

    // ===================================================
    // ✅ ADMIN REJECTED REQUEST
    // KEEP PREVIOUS FINAL STATUS
    // ===================================================

    if (status === "rejected") {
      finalStatus = previousFinalStatus;
    }

    // ===================================================
    // ✅ ADMIN APPROVED REQUEST
    // APPLY AGENT REQUEST
    // ===================================================

    else if (status === "approved") {

      // AGENT APPROVED
      if (agentStatus === "approved") {
        finalStatus = "approved";
      }

      // AGENT REJECTED
      else if (agentStatus === "rejected") {
        finalStatus = "rejected";
      }

      // AGENT HIDDEN
      else if (agentStatus === "hidden") {
        finalStatus = "hidden";
      }

      // AGENT DELETED
      else if (agentStatus === "deleted") {
        finalStatus = "deleted";
      }

      // DEFAULT
      else {
        finalStatus = previousFinalStatus;
      }
    }

    // ===================================================
    // ✅ UPDATE FINAL STATUS
    // ===================================================

    service.finalStatus = finalStatus;

    // ===================================================
    // ✅ RESET REVIEWS AFTER PROCESS
    // ===================================================

    // service.agentReview.status = "pending";
    // service.subadminReview.status = "pending";

    await service.save();

    return res.json({
      success: true,
      message: "Subadmin review processed successfully",
      finalStatus,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Error in subadmin review",
    });
  }
};