const Profession=require("../models/professions")
exports.createProfession = async (req, res) => {
  try {
    const { name, description } = req.body;

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const profession = await Profession.create({
      name,
      description,
    });

    res.status(201).json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getProfessions = async (req, res) => {
  try {
    const professions = await Profession.find({ isActive: true })
      .populate("name")

    res.json({
      success: true,
      data: professions,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

