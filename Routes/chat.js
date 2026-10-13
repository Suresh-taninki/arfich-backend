const { createOrGetChat, sendMessage, getMessages, getUserChats, startChat, sendInviteMessage, respondToInvite } = require("../controllers/chat");

const router = require("express").Router();

router.post("/chat", createOrGetChat);
router.post("/message", sendMessage);
router.get("/messages/:chatId/:userId",getMessages);
router.get("/chats/:userId", getUserChats);
router.post("/chat/start", startChat);
router.post("/chat/send-invite", sendInviteMessage);
router.post("/chat/invite-response/:messageId",respondToInvite)

module.exports = router;
