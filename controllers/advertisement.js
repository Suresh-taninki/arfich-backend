const Advertisement=require("../models/advertisement")
exports.createAds= async (req, res) => {
  try {
    const ad = await Advertisement.create(req.body);
    res.status(201).json(ad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get All Ads
exports.allAds = async (req, res) => {
  try {
    const ads = await Advertisement.find({ status: "active" });
    console.log(ads)
    res.json(ads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};