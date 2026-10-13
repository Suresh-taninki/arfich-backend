const Event = require("../models/Event");

// Create Event
router.post("/events", async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Events
router.get("/events", async (req, res) => {
  const events = await Event.find();
  res.json(events);
});

module.exports = router;
