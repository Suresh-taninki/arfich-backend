const Community = require("../../models/community/community");

// Create Community
exports.addCommunity=async (req, res) => {
  try {
    const { name, description, bannerImage, rules, isPrivate,userId } = req.body;
    const existingCommunity = await Community.findOne({ name });

    if (existingCommunity) {
      return res.status(400).json({ message: "Community name already exists." });
    }

    const community = new Community({
      name,
      description,
      bannerImage,
      createdBy: userId,
      admins: userId,
      members: [userId],
      rules,
      isPrivate,
    });

    await community.save();
    res.status(201).json(community);
  } catch (error) {
    res.status(500).json({ message: "Error creating community", error });
  }
};


// Get All Communities
exports.getAllCommunties=async (req, res) => {
  try {
    const communities = await Community.find().populate("createdBy", "username");

    res.status(200).json(communities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching communities", error });
  }
}
exports.getByCommunity=async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId)
      .populate("members", "username")
      .populate("admins", "username")
      .populate("posts");
    
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }
    
    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({ message: "Error fetching community", error });
  }
}


exports.communityJoin=async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    
    if (!community) return res.status(404).json({ message: "Community not found" });
    if (community.members.includes(req.user._id)) {
      return res.status(400).json({ message: "Already a member" });
    }

    community.members.push(req.user._id);
    await community.save();
    
    res.status(200).json({ message: "Joined community successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error joining community", error });
  }
}


exports.communityleave=async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    
    if (!community) return res.status(404).json({ message: "Community not found" });

    community.members = community.members.filter(member => member.toString() !== req.user._id.toString());
    await community.save();

    res.status(200).json({ message: "Left community successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error leaving community", error });
  }
}

exports.communityDelete =async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);

    if (!community) return res.status(404).json({ message: "Community not found" });
    if (!community.admins.includes(req.user._id)) {
      return res.status(403).json({ message: "Not authorized to delete" });
    }

    await Community.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Community deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting community", error });
  }
}

