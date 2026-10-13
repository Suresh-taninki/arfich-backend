const PostReport=require("../models/report")

exports.reportContent = async (req, res) => {
    console.log(req.body)
  try {
    const report = await PostReport.create(req.body);

    return res.json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
