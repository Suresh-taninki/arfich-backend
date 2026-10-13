const express = require('express');
const { addGroup, getAllGroup, getByGroup, groupJoin, getGroupSuggestions, getGroupMembers, getGroupPosts, getGroupRequests, getInviteUsers, sendInvite, handleGroupRequest, getGroupById, updateGroup, groupDelete } = require('../controllers/group/group');
const router = express.Router();
router.post("/group/join", groupJoin);
router.post("/group",addGroup); // Create Post
router.get("/group/:userId", getAllGroup); // Get All Posts
router.get("/groupDetails/:groupId",getGroupById)
router.put("/groupUpdate/:groupId",updateGroup)
router.delete("/groupDelete/:groupId",groupDelete)
router.get("/group/suggestions/:userId", getGroupSuggestions); // Get All Posts
router.get("/group/members/:groupId", getGroupMembers); // Get All Posts
router.get("/group/posts/:groupId", getGroupPosts); // Get All Posts
router.get("/group/request/:groupId/:userId", getGroupRequests); // Get All Posts
router.get("/group/invite-users/:groupId",getInviteUsers)
router.post("/group/request/action",handleGroupRequest)
// router.get("/posts/image/:userId", getUserPostImages); // Get All Posts
// router.get("/posts/:userId", getUserPosts); // Get All Posts
router.get("/group/details/:groupId", getByGroup);
// router.post("/like/:id", likePost); // Like/Unlike Post
// router.post("/comment/:postId", addComment); // Add Comment
// router.get("/comment/:postId", getComments); // Add Comment

// // router.post("/comment/:id", addComment); // Add Comment
// router.delete("/:id", deletePost); // Delete Post
// router.post("/follower", followUser);
// router.post("/followers/:id", getFollowStats); 

module.exports = router;
