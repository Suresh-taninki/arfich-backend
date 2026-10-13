const express = require('express');
const { createPost, getPosts, likePost, addComment, getComments, getSinglePost, getUserPosts, getSavedPost, toggleLike, getMyMediaPosts, getUserPostImages, editPost, deletePost, getActivities, getPostById } = require("../controllers/userPosts/PostLikeComment");
const { followUser, getFollowers, getFollowing } = require('../controllers/followandfollowers.js/followandfollwers');
const { savedPost } = require('../controllers/savedPost');
const router = express.Router();
const upload=require("../middleware/upload")
// router.post("/post", createPost); // Create Post
router.post(
    "/post",
    upload.array("media", 5), // accept multiple files
    createPost
);

router.get("/posts", getPosts); // Get All Posts
router.get("/activity/:userId", getActivities); // Get All Posts
router.get("/post/:postId", getSinglePost);
router.post("/post/saved", savedPost)
router.get("/post/saved/:userId", getSavedPost)
router.put("/post/:postId", editPost)
router.delete("/post/:postId", deletePost)
// router.get("/posts/media/:userId",  getMyMediaPosts);
router.get("/posts/image/:userId", getUserPostImages); // Get All Posts
router.get("/userposts/:userId", getUserPosts); // Get All Posts
router.get("/:id", getPostById); // Get Single Post
router.post("/like/:id", likePost); // Like/Unlike Post
router.post("/comment/:postId", addComment); // Add Comment
router.get("/comment/:postId", getComments); // Add Comment

router.post("/comment/like/:commentId", toggleLike); // Add Comment
// router.delete("/:id", deletePost); // Delete Post
router.post("/follow", followUser);
router.get("/following/:userId", getFollowing)
router.get("/followers/:userId", getFollowers)
// router.post("/followers/:id", getFollowStats); 

module.exports = router;
