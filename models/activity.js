const ActivitySchema = new mongoose.Schema(
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
      communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null },
      type: { type: String,  required: true },
      details: { type: String,default:"" } // Optional details (e.g., comment text)
    },
    { timestamps: true }
  );
  
  module.exports = mongoose.model("Activity", ActivitySchema);
  