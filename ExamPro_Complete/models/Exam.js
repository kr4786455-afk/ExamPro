const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, trim: true },
  options: {
    type: [String],
    validate: {
      validator: (items) => Array.isArray(items) && items.length >= 2,
      message: "Each question must have at least two options"
    },
    required: true
  },
  correctAnswer: { type: String, required: true },
  marks: { type: Number, default: 1, min: 1 }
});

const examSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  duration: { type: Number, required: true, min: 1 },
  totalMarks: { type: Number, required: true, min: 1 },
  questions: { type: [questionSchema], validate: v => v.length > 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Exam", examSchema);
