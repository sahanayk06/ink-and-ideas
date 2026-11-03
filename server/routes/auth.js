
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const Reaction = require("../models/Reaction");

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
      message: "Invalid or expired login token. Please log in again.",
    });
  }
}

// USER REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 30 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 8
    ) {
      return res.status(400).json({
        message:
          "Enter a username (3–30 characters), valid email, and password of at least 8 characters.",
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { username: cleanUsername },
        { email: cleanEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Registration successful!",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Username or email already registered.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Server error during registration.",
    });
  }
});

// USER LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");

      return res.status(500).json({
        message: "Authentication configuration error.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Server error during login.",
    });
  }
});

// GET MY PROFILE AND STATISTICS
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const posts = await Post.find({ author: user._id }).select(
      "_id category"
    );

    const postIds = posts.map((post) => post._id);

    const likesReceived = postIds.length
      ? await Reaction.countDocuments({
          post: { $in: postIds },
          type: "like",
        })
      : 0;

    const categories = new Set(
      posts.map((post) => post.category || "General")
    );

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        joinedAt: user.createdAt,
      },
      stats: {
        totalPosts: posts.length,
        likesReceived,
        totalCategories: categories.size,
      },
      posts: await Post.find({ author: user._id })
        .populate("author", "username")
        .sort({ createdAt: -1 }),
    });
  } catch (error) {
    console.error("Profile fetch error:", error.message);

    return res.status(500).json({
      message: "Unable to load profile.",
    });
  }
});

// UPDATE MY PROFILE
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username, bio } = req.body;

    if (
      typeof username !== "string" ||
      typeof bio !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 30 ||
      bio.trim().length > 250
    ) {
      return res.status(400).json({
        message: "Username must be 3–30 characters and bio must be under 250 characters.",
      });
    }

    const existingUser = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.userId },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "That username is already taken.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        username: username.trim(),
        bio: bio.trim(),
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        joinedAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error.message);

    return res.status(500).json({
      message: "Unable to update profile.",
    });
  }
});

module.exports = router;
