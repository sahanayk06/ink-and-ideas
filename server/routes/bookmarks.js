
const express = require("express");
const jwt = require("jsonwebtoken");
const Bookmark = require("../models/Bookmark");
const Post = require("../models/Post");

const router = express.Router();

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Please log in first." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    req.userId = decoded.userId || decoded.id;
    next();
  });
}

// Get all bookmarks belonging to the logged-in user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.userId })
      .populate({
        path: "post",
        populate: {
          path: "author",
          select: "username",
        },
      })
      .sort({ createdAt: -1 });

    const validBookmarks = bookmarks.filter(
      (bookmark) => bookmark.post !== null
    );

    res.json(validBookmarks);
  } catch (error) {
    console.error("Fetch bookmarks error:", error);
    res.status(500).json({ message: "Unable to fetch bookmarks." });
  }
});

// Add a story to bookmarks
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Story not found." });
    }

    const existingBookmark = await Bookmark.findOne({
      user: req.userId,
      post: req.params.postId,
    });

    if (existingBookmark) {
      return res.status(409).json({
        message: "This story is already bookmarked.",
      });
    }

    const bookmark = await Bookmark.create({
      user: req.userId,
      post: req.params.postId,
    });

    res.status(201).json({
      message: "Story bookmarked successfully!",
      bookmark,
    });
  } catch (error) {
    console.error("Add bookmark error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This story is already bookmarked.",
      });
    }

    res.status(500).json({ message: "Unable to bookmark story." });
  }
});

// Remove a story from bookmarks
router.delete("/:postId", authenticateToken, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      user: req.userId,
      post: req.params.postId,
    });

    if (!bookmark) {
      return res.status(404).json({
        message: "Bookmark not found.",
      });
    }

    res.json({ message: "Bookmark removed successfully!" });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ message: "Unable to remove bookmark." });
  }
});

module.exports = router;
