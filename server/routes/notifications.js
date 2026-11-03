
const express = require("express");
const jwt = require("jsonwebtoken");
const Notification = require("../models/Notification");

const router = express.Router();

// VERIFY LOGIN
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Please log in to view notifications.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired login token.",
    });
  }
}

// GET USER NOTIFICATIONS
router.get("/", authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.userId,
    })
      .populate("sender", "username")
      .populate("post", "title")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error.message);

    res.status(500).json({
      message: "Unable to fetch notifications.",
    });
  }
});

// MARK ALL NOTIFICATIONS AS READ
router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.userId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.json({
      message: "All notifications marked as read.",
    });
  } catch (error) {
    console.error("Update notifications error:", error.message);

    res.status(500).json({
      message: "Unable to update notifications.",
    });
  }
});

module.exports = router;
