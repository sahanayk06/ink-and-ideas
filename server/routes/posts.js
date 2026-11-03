
const express = require("express");
const jwt = require("jsonwebtoken");
const Post = require("../models/Post");

const router = express.Router();

const CATEGORIES = [
  "Technology",
  "Education",
  "Lifestyle",
  "Travel",
  "General",
];

// Verify user's login token
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
      message: "Invalid or expired login token. Please log in again.",
    });
  }
}

// GET: View all posts, optionally filtered by category
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};

    if (category && category !== "All") {
      if (!CATEGORIES.includes(category)) {
        return res.status(400).json({
          message: "Invalid category.",
        });
      }
      filter.category = category;
    }

    const posts = await Post.find(filter)
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Fetch posts error:", error.message);
    res.status(500).json({
      message: "Unable to fetch posts.",
    });
  }
});

// POST: Create a blog post
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { title, content, category = "General" } = req.body;

    if (
      typeof title !== "string" ||
      typeof content !== "string" ||
      !title.trim() ||
      !content.trim() ||
      title.trim().length > 150 ||
      content.trim().length > 20000 ||
      !CATEGORIES.includes(category)
    ) {
      return res.status(400).json({
        message: "Enter a valid title, content, and category.",
      });
    }

    const post = await Post.create({
      title: title.trim(),
      content: content.trim(),
      category,
      author: req.userId,
    });

    const savedPost = await post.populate("author", "username");

    res.status(201).json({
      message: "Blog post published successfully!",
      post: savedPost,
    });
  } catch (error) {
    console.error("Create post error:", error.message);
    res.status(500).json({
      message: "Unable to publish post.",
    });
  }
});

// PUT: Update an existing blog post
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { title, content, category = "General" } = req.body;

    if (
      typeof title !== "string" ||
      typeof content !== "string" ||
      !title.trim() ||
      !content.trim() ||
      title.trim().length > 150 ||
      content.trim().length > 20000 ||
      !CATEGORIES.includes(category)
    ) {
      return res.status(400).json({
        message: "Enter a valid title, content, and category.",
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({
        message: "You cannot edit someone else's post.",
      });
    }

    post.title = title.trim();
    post.content = content.trim();
    post.category = category;

    await post.save();
    await post.populate("author", "username");

    res.json({
      message: "Post updated successfully!",
      post,
    });
  } catch (error) {
    console.error("Update post error:", error.message);
    res.status(500).json({
      message: "Unable to update post.",
    });
  }
});

// DELETE: Delete an existing blog post
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({
        message: "You cannot delete someone else's post.",
      });
    }

    await post.deleteOne();

    res.json({
      message: "Post deleted successfully!",
    });
  } catch (error) {
    console.error("Delete post error:", error.message);
    res.status(500).json({
      message: "Unable to delete post.",
    });
  }
});

module.exports = router;
