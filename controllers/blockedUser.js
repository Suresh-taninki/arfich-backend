const PostReport=require("../models/blockedUser")

exports.BlockUser = async (req, res) => {
    console.log(req.body)
  try {
    const report = await PostReport.create(req.body);

    return res.json({
      success: true,
      message: "User Blocked Submit Successfully",
      report,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
