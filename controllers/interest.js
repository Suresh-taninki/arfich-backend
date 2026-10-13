const Interest=require("../models/interest")
exports.getAllInterests = async (req, res) => {
  try {
    const interests = await Interest.find().select("name description image");

    if (!interests || interests.length === 0) {
      return res.status(200).json({
        responseCode: 200,
        message: "No interests found",
        interests: [],
      });
    }

    res.status(200).json({
      responseCode: 200,
      message: "Interests fetched successfully",
      interests,
    });
  } catch (error) {
    console.error("Error fetching interests:", error);
    res.status(500).json({
      responseCode: 500,
      message: "Error fetching interests",
      error: error.message,
    });
  }
};



exports.addInterest = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    // Validate input
    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Interest name is required",
      });
    }

    // Check if interest already exists
    const existingInterest = await Interest.findOne({ name: name.trim() });
    if (existingInterest) {
      return res.status(200).json({
        success: true,
        message: "Interest already exists",
      });
    }

    // Create new interest
    const newInterest = new Interest({
      name: name.trim(),
      description: description || "",
      image: image || "",
    });

    await newInterest.save();

    res.status(201).json({
      success: true,
      message: "Interest added successfully",
    });
  } catch (error) {
    console.error("Error adding interest:", error);
    res.status(500).json({
      success: false,
      message: "Error adding interest",
      error: error.message,
    });
  }
};


// exports.addMultipleInterests = async (req, res) => {
//   try {

    
// const interests = [
//   { name: "Travel", image: "🌎" },
//   { name: "Food", image: "🍽️" },
//   { name: "Sustainability", image: "♻️" },
//   { name: "Cars", image: "🚗" },
//   { name: "Education", image: "🎓" },
//   { name: "Traditions", image: "🫂" },
//   { name: "Freelancing", image: "💼" },
//   { name: "Festivals", image: "🎉" },
//   { name: "Finance", image: "💰" },
//   { name: "Fitness", image: "💪" },
//   { name: "Startups", image: "🚀" },
//   { name: "Mental Health", image: "🧠" },
//   { name: "Movies", image: "🎬" },
//   { name: "Yoga", image: "🧘" },
//   { name: "Photography", image: "📸" },
//   { name: "Sports", image: "⚽" },
//   { name: "Fashion", image: "👗" },
//   { name: "Music", image: "🎵" },
//   { name: "Local Events", image: "📍" },
//   { name: "Design", image: "🎨" },
//   { name: "Gaming", image: "🎮" },
//   { name: "Marketing", image: "📣" },
//   { name: "Tech & Innovation", image: "💡" },
//   { name: "Business", image: "📊" },
//   { name: "Pets", image: "🐶" },
//   { name: "Visa", image: "🛂" },
//   { name: "Books", image: "📚" },
//   { name: "Gardening", image: "🪴" }
// ];
//     // Validate
//     if (!Array.isArray(interests) || interests.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Interests array is required",
//       });
//     }

//     // Normalize all data
//     const formatted = interests.map((item) => ({
//       name: item.name?.trim(),
//       description: item.description || "",
//       image: item.image || ""
//     }));

//     // Filter invalid ones
//     const validItems = formatted.filter((item) => item.name);

//     if (validItems.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "No valid interests found in request",
//       });
//     }

//     // Remove duplicates (by name)
//     const existing = await Interest.find({
//       name: { $in: validItems.map((i) => i.name) }
//     });

//     const existingNames = existing.map((e) => e.name);

//     const finalInsert = validItems.filter(
//       (i) => !existingNames.includes(i.name)
//     );

//     if (finalInsert.length === 0) {
//       return res.status(200).json({
//         success: true,
//         message: "All interests already exist",
//       });
//     }

//     // Insert in bulk
//     await Interest.insertMany(finalInsert);

//     res.status(201).json({
//       success: true,
//       message: "Interests added successfully",
//       addedCount: finalInsert.length,
//       skippedCount: existingNames.length
//     });

//   } catch (error) {
//     console.error("Error adding multiple interests:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error adding interests",
//       error: error.message,
//     });
//   }
// };

exports.editInterest = async (req, res) => {
  try {
    const { id } = req.params; // Interest ID from route param
    const { name, description, image } = req.body;
    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(200).json({
        responseCode:400,
        message: "Interest not found",
      });
    }

    // Update fields
    if (name) interest.name = name.trim();
    if (description) interest.description = description;
    if (image) interest.image = image;

    await interest.save();
    res.status(200).json({
      success: true,
      responseCode:200,
      message: "Interest updated successfully",
    });
  } catch (error) {
    console.error("Error updating interest:", error);
    res.status(200).json({
    responseCode:500,
      message: error.message,
    });
  }
};

exports.deleteInterest = async (req, res) => {
  try {
    const { _id } = req.params;

    const interest = await Interest.findById(_id);
    if (!interest) {
      return res.status(200).json({
    responseCode:400,
        message: "Interest not found",
      });
    }

    await Interest.findByIdAndDelete(id);

    res.status(200).json({
    responseCode:200,
      message: "Interest deleted successfully",
    });
  } catch (error) {
    res.status(200).json({
    responseCode:500,
      message: error.message,
    });
  }
};


