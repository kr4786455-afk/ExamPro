const express = require("express");
const Result = require("../models/Result");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

// Student: own results only.
router.get("/my", auth, async (req, res) => {
  const results = await Result.find({ student: req.user.id })
    .populate("exam", "title duration totalMarks")
    .sort({ submittedAt: -1 });
  res.json({ results });
});

// Admin: all results.
router.get("/all", auth, adminOnly, async (req, res) => {
  const results = await Result.find()
    .populate("student", "name email")
    .populate("exam", "title")
    .sort({ submittedAt: -1 });
  res.json({ results });
});

module.exports = router;
