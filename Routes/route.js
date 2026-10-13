const express = require('express');
const { allAds, createAds } = require('../controllers/advertisement');
const { addCommunity, getAllCommunties, getByCommunity, communityJoin, communityleave, communityDelete } = require('../controllers/community/communities');
const { updatedPrivacy, getPrivacy } = require('../controllers/privacySetting');
const { savedPost, getSavedPost, unsavedPostrouter } = require('../controllers/savedPost');
const {createAdmin , loginAdmin} = require('../controllers/admin');
const router = express.Router();
// router.get("/get_advertisement",allAds)
// router.post("/create_advertisement",createAds)
//community
router.post("/add_community", addCommunity); 
router.post("/communties", getAllCommunties); 
router.get("/community/:communityId", getByCommunity); 
router.get("/community/:id/join", communityJoin); 
router.get("/community/:community/leave", getAllCommunties); 
router.get("/community/:communityId", communityleave); 
router.get("/community/:communityId", communityDelete); 


//privacy
router.put("/privacy", updatedPrivacy); 
router.get("/privacy", getPrivacy); 
//savedPosts
router.post("/save", savedPost);
// router.get("/saved", getSavedPost);
router.get("/unsaved/:id",unsavedPostrouter);
//interest
//adertisments
router.post("/add_ads", createAds); 
router.get("/all_ads", allAds); 

//blog
// router.get("/blogs", Blogs); 
// router.get("/blog/:id", getBlogById);
// router.post("/blogs", createBlog);
// router.put("/blogs/:id", updateBlog);
// router.delete("/blogs/:id", deleteBlog);

// router.post("/upload", upload.single("image"), uploadSingleImage);
//regions



//admin routes
router.post("/admin/signup", createAdmin);
router.post("/admin/login", loginAdmin);


module.exports = router;
