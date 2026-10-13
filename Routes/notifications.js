const { getNotifications, readNotification, sendAnnouncement } = require("../controllers/notifications");

const router = require("express").Router();

router.get("/notifications/:userId", getNotifications);
router.post("/notifications/announcement", sendAnnouncement);
router.post("/notifications/read/:id", readNotification);

module.exports = router;
