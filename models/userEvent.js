const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    hostedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: "Community", default: null },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    image: { type: String }
  }, { timestamps: true });
  
  module.exports = mongoose.model("Event", EventSchema);
  