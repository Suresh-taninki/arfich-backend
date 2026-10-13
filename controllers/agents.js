// controllers/agentAuthController.js

const Agent = require("../models/agents");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Service=require("../models/service")
// ✅ REGISTER AGENT
exports.registerAgent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Agent.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Agent already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await Agent.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({ success: true, agent });
  } catch (err) {
    res.status(500).json({ message: "Error registering agent" });
  }
};

// ✅ LOGIN AGENT
exports.loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: agent._id, role: "agent" },
      "SECRET_KEY",
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, agent });
  } catch (err) {
    res.status(500).json({ message: "Error login agent" });
  }
};


exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find()
      .sort({ createdAt: -1 })
      .select("-password") // 🔥 hide password
      .lean();

    const formatted = agents.map((a) => ({
      agentId: a._id,
      name: a.name || "—",
      email: a.email || "—",
      isActive: a.isActive ?? true,
      createdAt: a.createdAt,
    }));

    res.json({
      success: true,
      count: formatted.length,
      agents: formatted,
    });
  } catch (err) {
    console.error("GET AGENTS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch agents" });
  }
};