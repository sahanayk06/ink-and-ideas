
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const Reaction = require("../models/Reaction");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const router = express.Router();

// Verify login token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Please log in to react.",
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


// GET: Get likes and the current user's reaction
router.get("/:postId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(400).json({
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const [likes, dislikes] = await Promise.all([
      Reaction.countDocuments({
        post: req.params.postId,
        type: "like",
      }),
      Reaction.countDocuments({
        post: req.params.postId,
        type: "dislike",
      }),
    ]);

    let userReaction = null;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        const reaction = await Reaction.findOne({
          post: req.params.postId,
          user: decoded.userId,
        });

        userReaction = reaction ? reaction.type : null;
      } catch {
        userReaction = null;
      }
    }

    res.json({
      likes,
      dislikes,
      userReaction,
    });
  } catch (error) {
    console.error("Fetch reactions error:", error.message);

    res.status(500).json({
      message: "Unable to fetch reactions.",
    });
  }
});


// POST: Like or dislike a post
router.post("/:postId", authenticateToken, async (req, res) => {
  try {
    const { type } = req.body;

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({
        message: "Reaction must be like or dislike.",
      });
    }

    if (!mongoose.isValidObjectId(req.params.postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const existingReaction = await Reaction.findOne({
      user: req.userId,
      post: req.params.postId,
    });

    let action;

    if (existingReaction) {
      if (existingReaction.type === type) {
        await existingReaction.deleteOne();
        action = "removed";
      } else {
        existingReaction.type = type;
        await existingReaction.save();
        action = "updated";
      }
    } else {
      await Reaction.create({
        user: req.userId,
        post: req.params.postId,
        type,
      });
      action = "added";
    }
        // CREATE NOTIFICATION FOR STORY AUTHOR
    if (
      action !== "removed" &&
      String(post.author) !== String(req.userId)
    ) {
      await Notification.create({
        recipient: post.author,
        sender: req.userId,
        post: post._id,
        type,
        message:
          type === "like"
            ? "Someone liked your story."
            : "Someone disliked your story.",
      });
    }

    const [likes, dislikes] = await Promise.all([
      Reaction.countDocuments({
        post: req.params.postId,
        type: "like",
      }),
      Reaction.countDocuments({
        post: req.params.postId,
        type: "dislike",
      }),
    ]);

    res.json({
      message: `Reaction ${action} successfully!`,
      action,
      likes,
      dislikes,
      userReaction: action === "removed" ? null : type,
    });
  } catch (error) {
    console.error("Save reaction error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reacted to this post.",
      });
    }

    res.status(500).json({
      message: "Unable to save reaction.",
    });
  }
});

module.exports = router;
