const Category = require("../models/serviceCategories");
const SubCategory = require("../models/serviceSubCategories");

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const { title, slug, icon } = req.body;

    const category = await Category.create({
      title,
      slug,
      icon,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get Categories with SubCategories
exports.getCategoriesWithSubs = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });

    const result = await Promise.all(
      categories.map(async (cat) => {
        const subs = await SubCategory.find({
          category: cat._id,
          isActive: true,
        });

        return {
          ...cat._doc,
          subs,
        };
      })
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.createCategories = async (req, res) => {
  try {
    const categories = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: "Categories must be an array"
      });
    }
    const inserted = [];
    for (const cat of categories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (!exists) {
        const newCat = await Category.create({
          title: cat.title,
          slug: cat.slug
        });

        inserted.push(newCat);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Categories stored successfully",
      totalInserted: inserted.length,
      data: inserted
    });

  } catch (error) {

    console.error("CATEGORY INSERT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Error storing categories",
      error: error.message
    });
  }
};
exports.seedSubCategories = async (req, res) => {
  try {

    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: "Invalid categories data"
      });
    }

    let inserted = [];
    for (const cat of categories) {

      // Find category by title
      const categoryDoc = await Category.findOne({
        title: cat.name
      });

      if (!categoryDoc) {
        console.log(`Category not found: ${cat.name}`);
        continue;
      }

      for (const sub of cat.subcategories) {

        const exists = await SubCategory.findOne({
          name: sub,
          category: categoryDoc._id
        });

        if (!exists) {

          const newSub = await SubCategory.create({
            name: sub,
            category: categoryDoc._id
          });

          inserted.push(newSub);
        }
      }
    }

    return res.json({
      success: true,
      message: "Subcategories inserted successfully",
      totalInserted: inserted.length
    });

  } catch (error) {

    console.error("SUBCATEGORY SEED ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
