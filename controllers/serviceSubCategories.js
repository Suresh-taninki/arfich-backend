const SubCategory = require("../models/serviceSubCategories");

// Create SubCategory
exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;

    const subCategory = await SubCategory.create({
      name,
      category: categoryId,
    });

    res.status(201).json({ success: true, data: subCategory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get SubCategories by Category
exports.getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await SubCategory.find({
      category: categoryId,
      isActive: true,
    });

    res.status(200).json({
      success: true,
      count: subCategories.length,
      data: subCategories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
