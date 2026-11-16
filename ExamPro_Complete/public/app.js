const API = "/api";
let token = localStorage.getItem("exampro_token") || "";
let currentUser = JSON.parse(localStorage.getItem("exampro_user") || "null");
let authMode = "login";
let activeExam = null;
let timerInterval = null;
let remainingSeconds = 0;
let startedAt = null;

const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function setMessage(id, message, error = false) {
  const el = $(id);
  el.textContent = message;
  el.className = `message ${error ? "error" : "success"}`;
}

function updateAuthMode(mode) {
  authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("nameField").classList.toggle("hidden", mode !== "register");
  $("authSubmit").textContent = mode === "login" ? "Login" : "Create account";
  $("authMessage").textContent = "";
}

$("loginTab").addEventListener("click", () => updateAuthMode("login"));
$("registerTab").addEventListener("click", () => updateAuthMode("register"));

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const body = {
      email: $("email").value.trim(),
      password: $("password").value
    };
    if (authMode === "register") body.name = $("name").value.trim();
    const data = await api(`/auth/${authMode === "login" ? "login" : "register"}`, {
      method: "POST", body: JSON.stringify(body)
    });
    if (authMode === "register") {
      setMessage("authMessage", "Registration successful. You can now log in.");
      updateAuthMode("login");
      $("email").value = body.email;
    } else {
      token = data.token;
      currentUser = data.user;
      localStorage.setItem("exampro_token", token);
      localStorage.setItem("exampro_user", JSON.stringify(currentUser));
      renderDashboard();
    }
  } catch (error) {
    setMessage("authMessage", error.message, true);
  }
});

function logout() {
  token = "";
  currentUser = null;
  localStorage.removeItem("exampro_token");
  localStorage.removeItem("exampro_user");
  if (timerInterval) clearInterval(timerInterval);
  hide("dashboard");
  show("authPanel");
  $("userArea").innerHTML = "";
}

function renderDashboard() {
  hide("authPanel");
  show("dashboard");
  hide("attemptPanel");
  hide("resultPanel");
  $("userArea").innerHTML = `<span>${escapeHtml(currentUser.name)} · ${currentUser.role}</span><button class="secondary" id="logoutBtn">Logout</button>`;
  $("logoutBtn").addEventListener("click", logout);
  $("welcomeTitle").textContent = `Welcome, ${currentUser.name}`;
  if (currentUser.role === "admin") {
    show("adminPanel"); hide("studentPanel");
    addQuestionEditor();
    loadAdminExams();
  } else {
    hide("adminPanel"); show("studentPanel");
    loadStudentData();
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

let questionCount = 0;
function addQuestionEditor() {
  const index = questionCount++;
  const div = document.createElement("div");
  div.className = "question-editor";
  div.innerHTML = `
    <h3>Question ${index + 1}</h3>
    <label>Question</label><input class="q-text" required placeholder="Enter question">
    <div class="option-grid">
      <div><label>Option A</label><input class="q-option" required></div>
      <div><label>Option B</label><input class="q-option" required></div>
      <div><label>Option C</label><input class="q-option" required></div>
      <div><label>Option D</label><input class="q-option" required></div>
    </div>
    <div class="form-grid">
      <div><label>Correct answer (exact option text)</label><input class="q-answer" required></div>
      <div><label>Marks</label><input class="q-marks" type="number" min="1" value="1" required></div>
    </div>`;
  $("questionEditor").appendChild(div);
}
$("addQuestionBtn").addEventListener("click", addQuestionEditor);

$("createExamForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const blocks = [...document.querySelectorAll(".question-editor")];
    const questions = blocks.map(block => {
      const options = [...block.querySelectorAll(".q-option")].map(i => i.value.trim());
      const correctAnswer = block.querySelector(".q-answer").value.trim();
      if (!options.includes(correctAnswer)) throw new Error("Correct answer must exactly match one of its options.");
      return {
        questionText: block.querySelector(".q-text").value.trim(),
        options,
        correctAnswer,
        marks: Number(block.querySelector(".q-marks").value)
      };
    });
    const totalMarks = Number($("totalMarks").value);
    const sumMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    if (sumMarks !== totalMarks) throw new Error(`Question marks add up to ${sumMarks}; total marks must match.`);
    const data = await api("/exams", {
      method: "POST",
      body: JSON.stringify({
        title: $("examTitle").value.trim(),
        description: $("description").value.trim(),
        duration: Number($("duration").value),
        totalMarks,
        questions
      })
    });
    setMessage("adminMessage", data.message);
    $("createExamForm").reset();
    $("questionEditor").innerHTML = "";
    questionCount = 0;
    addQuestionEditor();
    loadAdminExams();
  } catch (error) {
    setMessage("adminMessage", error.message, true);
  }
});

async function loadAdminExams() {
  try {
    const { exams } = await api("/exams/admin/all");
    $("adminExams").innerHTML = exams.length ? exams.map(exam => `
      <div class="list-card">
        <div><h3>${escapeHtml(exam.title)} ${exam.isPublished ? '<span class="badge">Published</span>' : '<span class="badge draft">Draft</span>'}</h3>
        <p>${exam.questions.length} questions · ${exam.duration} minutes · ${exam.totalMarks} marks</p></div>
        <div class="list-actions">${exam.isPublished ? "" : `<button class="primary" data-publish="${exam._id}">Publish</button>`}</div>
      </div>`).join("") : "<p class='muted'>No exams created yet.</p>";
    document.querySelectorAll("[data-publish]").forEach(button => {
      button.addEventListener("click", () => publishExam(button.dataset.publish));
    });
  } catch (error) { setMessage("adminMessage", error.message, true); }
}

async function publishExam(id) {
  try {
    const data = await api(`/exams/${id}/publish`, { method: "PATCH" });
    setMessage("adminMessage", data.message);
    loadAdminExams();
  } catch (error) { setMessage("adminMessage", error.message, true); }
}

async function loadStudentData() {
  try {
    const [examData, resultData] = await Promise.all([
      api("/exams"), api("/results/my")
    ]);
    $("examList").innerHTML = examData.exams.length ? examData.exams.map(exam => `
      <div class="list-card"><div><h3>${escapeHtml(exam.title)}</h3>
      <p>${escapeHtml(exam.description)} · ${exam.questions.length} questions · ${exam.duration} minutes · ${exam.totalMarks} marks</p></div>
      <button class="primary" data-start="${exam._id}">Start exam</button></div>`).join("") : "<p class='muted'>No published exams available yet.</p>";
    document.querySelectorAll("[data-start]").forEach(button => button.addEventListener("click", () => startExam(button.dataset.start)));
    $("myResults").innerHTML = resultData.results.length ? resultData.results.map(r => `
      <div class="list-card"><div><h3>${escapeHtml(r.exam?.title || "Exam")}</h3>
      <p>Score: ${r.score}/${r.totalMarks} · ${r.percentage}% · ${new Date(r.submittedAt).toLocaleString()}</p></div>
      <span class="badge">${r.percentage >= 40 ? "Pass" : "Needs improvement"}</span></div>`).join("") : "<p class='muted'>No results yet.</p>";
  } catch (error) { $("examList").innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`; }
}

async function startExam(id) {
  try {
    const { exam } = await api(`/exams/${id}`);
    activeExam = exam;
    startedAt = Date.now();
    remainingSeconds = exam.duration * 60;
    $("attemptTitle").textContent = exam.title;
    $("attemptQuestions").innerHTML = exam.questions.map((q, index) => `
      <div class="attempt-question">
        <h3>${index + 1}. ${escapeHtml(q.questionText)} <small>(${q.marks} marks)</small></h3>
        ${q.options.map(option => `<label class="choice"><input type="radio" name="${q._id}" value="${escapeHtml(option)}"> ${escapeHtml(option)}</label>`).join("")}
      </div>`).join("");
    hide("studentPanel"); show("attemptPanel");
    startTimer();
  } catch (error) { alert(error.message); }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  updateTimer();
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimer();
    if (remainingSeconds <= 0) submitAttempt(true);
  }, 1000);
}
function updateTimer() {
  const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
  const secs = (remainingSeconds % 60).toString().padStart(2, "0");
  $("timer").textContent = `${mins}:${secs}`;
}

$("attemptForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (confirm("Submit your exam now? You cannot submit it again.")) submitAttempt(false);
});

async function submitAttempt(autoSubmitted) {
  if (!activeExam || $("attemptForm").dataset.submitting === "yes") return;
  $("attemptForm").dataset.submitting = "yes";
  if (timerInterval) clearInterval(timerInterval);
  const answers = activeExam.questions.map(q => {
    const selected = document.querySelector(`input[name="${q._id}"]:checked`);
    return { questionId: q._id, selectedAnswer: selected ? selected.value : "" };
  });
  try {
    const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const data = await api(`/exams/${activeExam._id}/submit`, {
      method: "POST", body: JSON.stringify({ answers, timeTakenSeconds })
    });
    hide("attemptPanel"); show("resultPanel");
    $("resultTitle").textContent = autoSubmitted ? "Time is up — exam submitted" : "Exam submitted successfully";
    const r = data.result;
    $("resultDetails").innerHTML = [
      ["Score", `${r.score}/${r.totalMarks}`],
      ["Percentage", `${r.percentage}%`],
      ["Correct", r.correct],
      ["Wrong", r.wrong],
      ["Skipped", r.skipped],
      ["Time taken", `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`],
      ["Status", r.status]
    ].map(([label, value]) => `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
    $("attemptForm").dataset.submitting = "";
  } catch (error) {
    setMessage("attemptMessage", error.message, true);
    $("attemptForm").dataset.submitting = "";
  }
}

$("backDashboard").addEventListener("click", () => {
  hide("resultPanel"); show("studentPanel"); activeExam = null; loadStudentData();
});
$("refreshBtn").addEventListener("click", () => currentUser?.role === "admin" ? loadAdminExams() : loadStudentData());

if (token && currentUser) renderDashboard();
