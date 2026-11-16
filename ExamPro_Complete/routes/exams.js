const express = require("express");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Result = require("../models/Result");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

// Admin: create an exam (not published until admin publishes it).
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { title, description, duration, totalMarks, questions } = req.body;
    if (!title || !duration || !totalMarks || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Provide title, duration, totalMarks and at least one question." });
    }

    const exam = await Exam.create({
      title, description, duration, totalMarks, questions,
      createdBy: req.user.id
    });

    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (error) {
    res.status(400).json({ message: "Exam creation failed", error: error.message });
  }
});

// Admin: list all exams, including drafts.
router.get("/admin/all", auth, adminOnly, async (req, res) => {
  const exams = await Exam.find().sort({ createdAt: -1 }).select("-questions.correctAnswer");
  res.json({ exams });
});

// Admin: publish/unpublish an exam.
router.patch("/:id/publish", auth, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid exam ID." });
    const exam = await Exam.findByIdAndUpdate(
      req.params.id, { isPublished: true }, { new: true, runValidators: true }
    ).select("-questions.correctAnswer");
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    res.json({ message: "Exam published successfully", exam });
  } catch (error) {
    res.status(500).json({ message: "Publishing failed", error: error.message });
  }
});

// Student: list published exams only. Never return correct answers.
router.get("/", auth, async (req, res) => {
  const exams = await Exam.find({ isPublished: true })
    .select("-questions.correctAnswer")
    .sort({ createdAt: -1 });
  res.json({ exams });
});

// Student: fetch one published exam without answers.
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid exam ID." });
    const exam = await Exam.findOne({ _id: req.params.id, isPublished: true })
      .select("-questions.correctAnswer");
    if (!exam) return res.status(404).json({ message: "Published exam not found." });
    res.json({ exam });
  } catch (error) {
    res.status(500).json({ message: "Could not load exam.", error: error.message });
  }
});

// Student: submit answers; server grades them and prevents duplicate submissions.
router.post("/:id/submit", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid exam ID." });
    const exam = await Exam.findOne({ _id: req.params.id, isPublished: true });
    if (!exam) return res.status(404).json({ message: "Published exam not found." });

    const alreadySubmitted = await Result.findOne({ student: req.user.id, exam: exam._id });
    if (alreadySubmitted) return res.status(409).json({ message: "You have already submitted this exam." });

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const answerMap = new Map(answers.map(a => [String(a.questionId), a.selectedAnswer]));
    let score = 0, correct = 0, wrong = 0, skipped = 0;

    for (const question of exam.questions) {
      const selected = answerMap.get(String(question._id));
      if (!selected) {
        skipped++;
      } else if (selected === question.correctAnswer) {
        correct++;
        score += question.marks;
      } else {
        wrong++;
      }
    }

    const totalMarks = exam.totalMarks;
    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
    const timeTakenSeconds = Math.max(0, Math.min(Number(req.body.timeTakenSeconds) || 0, exam.duration * 60));

    const result = await Result.create({
      student: req.user.id, exam: exam._id, answers,
      score, totalMarks, percentage, correct, wrong, skipped, timeTakenSeconds
    });

    res.status(201).json({
      message: "Exam submitted successfully",
      result: {
        id: result._id, examTitle: exam.title, score, totalMarks,
        percentage, correct, wrong, skipped, timeTakenSeconds,
        status: percentage >= 40 ? "Pass" : "Needs improvement"
      }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already submitted this exam." });
    res.status(500).json({ message: "Submission failed", error: error.message });
  }
});

module.exports = router;
