const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const Admin = require('../models/admin');


const JWT_SECRET = "mySuperSecretKey123!";

const generateToken = (user) => {
  const payload = {
    _id: user._id,
  };

  return jwt.sign(payload, JWT_SECRET)
};

// const validateCredentials = async (phone, password,role) => {
//   const user = await Admin.findOne({ phone,role });

//   if (!user) return null;

//   const isPasswordValid = await bcrypt.compare(password, user.password);
//   if(role !==user.role) return null 
//   if (!isPasswordValid) return null;

//   return user;
// };

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(200).json({ responseCode:400, message: "Access Denied: No Token Provided" });
  }

try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(200).json({ responseCode: 400, message: "Unauthorized: Token missing" });
    }


    const token = authHeader.split(" ")[1];
    console.log(token)

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(decoded)

    req.userId = decoded._id; // store the user ID from the token
    next();
  } catch (error) {
    return res.status(401).json({ responseCode: 401, message: "Invalid or expired token" });
  }
};

// Middleware to check if user is an Admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Access Denied: Admins Only" });
  }
  next();
};

// Middleware to check if user is a Hardware
const isHardware = (req, res, next) => {
  if (req.user.role !== "hardware") {
    return res.status(403).json({ error: "Access Denied: Hardware Only" });
  }
  next();
};

// Middleware to check if user is a Chef
const isChef = (req, res, next) => {
  if (req.user.role !== "chef") {
    return res.status(403).json({ error: "Access Denied: Chefs Only" });
  }
  next();
};



module.exports = { generateToken,  verifyToken, isAdmin, isHardware, isChef};
