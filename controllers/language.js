const Language=require("../models/language")
exports.getAllLanguage = async (req, res) => {
  try {
    const language = await Language.find().select("name description image");

    if (!language || language.length === 0) {
      return res.status(200).json({
        responseCode: 200,
        message: "No Language found",
      });
    }

    res.status(200).json({
      responseCode: 200,
      message: "Language fetched successfully",
      language,
    });
  } catch (error) {
    console.error("Error fetching Language:", error);
    res.status(200).json({
      responseCode: 500,
      message: error.message,
    });
  }
};



exports.addLanguage = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Language name is required",
      });
    }

    // Check if interest already exists
    const existingLanguage = await Language.findOne({ name: name.trim() });
    if (existingLanguage) {
      return res.status(200).json({
        responseCode:400,
        message: "Language already exists",
      });
    }

    // Create new interest
    const newInterest = new Language({
      name: name.trim(),
      description: description || "",
      image: image || "",
    });

    await newInterest.save();

    res.status(200).json({
      responseCode:200,
      message: "Language added successfully",
    });
  } catch (error) {
    console.error("Error adding Language:", error);
    res.status(200).json({
        responseCode:500,
      message: "Error adding Language",
      error: error.message,
    });
  }
};

exports.editLanguage = async (req, res) => {
  try {
    const { id } = req.params; // Interest ID from route param
    const { name, description, image } = req.body;
    const language = await Language.findById(id);
    if (!language) {
      return res.status(200).json({
        responseCode:400,
        message: "Language not found",
      });
    }

    // Update fields
    if (name) language.name = name.trim();
    if (description) language.description = description;
    if (image) language.image = image;

    await language.save();
    res.status(200).json({
      responseCode:200,
      message: "Language updated successfully",
    });
  } catch (error) {
    console.error("Error updating Language:", error);
    res.status(200).json({
    responseCode:500,
      message: error.message,
    });
  }
};

// exports.addMultipleLanguages = async (req, res) => {
//   try {
// const languages=  [
//   { name: "Hindi", image: "अ" },
//   { name: "English", image: "En" },
//   { name: "Telugu", image: "త" },
//   { name: "Tamil", image: "த" },
//   { name: "Kannada", image: "ಕ" },
//   { name: "Bengali", image: "অ" },
//   { name: "Other", image: "🌐" }
// ]

//     if (!Array.isArray(languages) || languages.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Languages array is required",
//       });
//     }

//     const formatted = languages.map((item) => ({
//       name: item.name?.trim(),
//       image: item.image || "",
//       description: item.description || ""
//     }));

//     const validItems = formatted.filter((item) => item.name);

//     const existing = await Language.find({
//       name: { $in: validItems.map((i) => i.name) }
//     });

//     const existingNames = existing.map((e) => e.name);

//     const finalInsert = validItems.filter(
//       (i) => !existingNames.includes(i.name)
//     );

//     if (finalInsert.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "All languages already exist",
//         addedCount: 0,
//         skippedCount: existingNames.length
//       });
//     }

//     await Language.insertMany(finalInsert);

//     return res.status(201).json({
//       success: true,
//       message: "Languages added successfully",
//       addedCount: finalInsert.length,
//       skippedCount: existingNames.length
//     });

//   } catch (error) {
//     console.error("Error adding languages:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error adding languages",
//       error: error.message,
//     });
//   }
// };


exports.deleteLanguage = async (req, res) => {
  try {
    const { _id } = req.params;

    const language = await Language.findById(_id);
    if (!language) {
      return res.status(200).json({
    responseCode:400,
        message: "Language not found",
      });
    }

    await Language.findByIdAndDelete(id);

    res.status(200).json({
    responseCode:200,
      message: "Language deleted successfully",
    });
  } catch (error) {
    res.status(200).json({
    responseCode:500,
      message: error.message,
    });
  }
};


