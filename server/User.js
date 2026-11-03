
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "Welcome to my Ink & Ideas profile!",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
