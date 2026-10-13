const SavedPost=require("../models/savedPost")
exports.savedPost = async (req, res) => {
  try {
    const { postId, userId } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({
        responseCode: 400,
        message: "postId and userId are required"
      });
    }

    // CHECK IF ALREADY SAVED
    const existingSaved = await SavedPost.findOne({ userId, postId });

    // 🔥 UNSAVE POST
    if (existingSaved) {
      await SavedPost.deleteOne({ _id: existingSaved._id });

      return res.status(200).json({
        responseCode: 200,
        isSaved: false,
        message: "Post unsaved successfully"
      });
    }

    // 🔥 SAVE POST
    const save = new SavedPost({ userId, postId });
    await save.save();

    return res.status(200).json({
      responseCode: 200,
      isSaved: true,
      message: "Post saved successfully"
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      responseCode: 500,
      message: "Internal server error"
    });
  }
};


// TIME AGO FUNCTION


exports.unsavedPostrouter=async (req, res) => {
    try {
        await SavedPost.findOneAndDelete({ userId: req.user.id, postId: req.params.postId });
        res.status(200).json({ message: "Post unsaved successfully" });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
