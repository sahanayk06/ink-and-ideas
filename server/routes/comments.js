
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const router = express.Router();

// Verify login token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Please log in to continue.",
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

// GET: View comments for a particular post
router.get("/:postId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comments = await Comment.find({
      post: req.params.postId,
    })
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error("Fetch comments error:", error.message);
    res.status(500).json({ message: "Unable to fetch comments." });
  }
});

// POST: Add a comment
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (
      typeof content !== "string" ||
      !content.trim() ||
      content.trim().length > 1000
    ) {
      return res.status(400).json({
        message: "Comment must contain 1–1000 characters.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comment = await Comment.create({
      content: content.trim(),
      author: req.userId,
      post: req.params.postId,
    });

    await comment.populate("author", "username");
// CREATE NOTIFICATION FOR STORY AUTHOR
if (String(post.author) !== String(req.userId)) {
  await Notification.create({
    recipient: post.author,
    sender: req.userId,
    post: post._id,
    type: "comment",
    message: "Someone commented on your story.",
  });
}
    res.status(201).json({
      message: "Comment added successfully!",
      comment,
    });
  } catch (error) {
    console.error("Add comment error:", error.message);
    res.status(500).json({ message: "Unable to add comment." });
  }
});

// DELETE: Delete your own comment
router.delete("/:commentId", authenticateToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({
        message: "You cannot delete someone else's comment.",
      });
    }

    await comment.deleteOne();

    res.json({ message: "Comment deleted successfully!" });
  } catch (error) {
    console.error("Delete comment error:", error.message);
    res.status(500).json({ message: "Unable to delete comment." });
  }
});

module.exports = router;
