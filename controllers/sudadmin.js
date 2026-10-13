// controllers/subadminAuthController.js

const Subadmin = require("../models/sudAdmin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Service=require("../models/service")

// ✅ REGISTER
exports.registerSubadmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Subadmin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Subadmin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const subadmin = await Subadmin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({ success: true, subadmin });
  } catch (err) {
    res.status(500).json({ message: "Error registering subadmin" });
  }
};

// ✅ LOGIN
exports.loginSubadmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const subadmin = await Subadmin.findOne({ email });
    if (!subadmin) {
      return res.status(404).json({ message: "Subadmin not found" });
    }

    const isMatch = await bcrypt.compare(password, subadmin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: subadmin._id, role: "subadmin" },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, subadmin });
  } catch (err) {
    res.status(500).json({ message: "Error login subadmin" });
  }
};



// controllers/subadminController.js


exports.getAllSubadmins = async (req, res) => {
  try {
    const subadmins = await Subadmin.find()
      .sort({ createdAt: -1 })
      .select("-password")
      .lean();

    const formatted = subadmins.map((s) => ({
      subadminId: s._id,
      name: s.name || "—",
      email: s.email || "—",
      isActive: s.isActive ?? true,
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      subadmins: formatted,
    });
  } catch (err) {
    console.error("GET SUBADMINS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch subadmins" });
  }
};