# ExamPro – Online Examination System

A beginner-friendly full-stack project using **Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, HTML, CSS and JavaScript**.

## Included features

- Student registration and login
- Password hashing with bcrypt
- JWT authentication
- Admin-only exam creation and publishing
- MCQ questions with options and marks
- Student dashboard showing published exams
- Timed exam attempt with automatic submission when the browser timer reaches zero
- Server-side answer checking (correct answers are not sent to students)
- Score, percentage, correct, wrong and skipped counts
- Student result history and admin result listing

> This is an academic/demo project. Before real-world deployment, add stronger server-enforced exam timing, rate limiting, audit logs, CSRF/security hardening, robust validation, backups and deployment secrets management.

---

## 1. Requirements

Install:
- Node.js (LTS recommended)
- MongoDB Community Server, running locally
- VS Code

## 2. Open project

Extract the ZIP. Open the `ExamPro_Complete` folder in VS Code.

Open VS Code Terminal in that folder and run:

```powershell
npm install
```

## 3. Configure environment

Copy `.env.example` and rename the copy to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/exampro
JWT_SECRET=use_a_long_random_secret_here
```

Keep `.env` private. Do not upload it to GitHub.

## 4. Start server

```powershell
npm run dev
```

If nodemon has an issue, use:

```powershell
node .\server.js
```

Expected terminal output:

```text
MongoDB Connected Successfully!
ExamPro running at http://localhost:5000
```

Open `http://localhost:5000` in your browser.

## 5. Register a student

On the website, choose Register, enter name/email/password (minimum 6 characters), and create an account. New accounts are students by default.

## 6. Promote your own account to admin (local demo only)

Do not add an admin role field to the public registration form. For a local academic demo, use MongoDB Shell (`mongosh`):

```javascript
use exampro
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

Log out and log in again so the new JWT contains the admin role.

## 7. Admin workflow

- Log in as admin.
- Create an exam, add questions and four options per question.
- Enter the correct answer exactly as one of the options.
- Ensure the sum of question marks equals Total marks.
- Click Create exam.
- In Manage exams, click Publish.

## 8. Student workflow

- Register a second account (it will be a student).
- Log in as that student in another browser/incognito window.
- Published exams appear under Available exams.
- Start an exam, answer MCQs, and submit before the timer ends.
- The result appears after submission and is saved in MongoDB.

## 9. Useful API endpoints

All protected endpoints require:

`Authorization: Bearer YOUR_JWT_TOKEN`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register student |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/exams` | Admin creates exam |
| GET | `/api/exams/admin/all` | Admin lists all exams |
| PATCH | `/api/exams/:id/publish` | Admin publishes exam |
| GET | `/api/exams` | Student lists published exams |
| GET | `/api/exams/:id` | Student gets exam without answers |
| POST | `/api/exams/:id/submit` | Submit answers and calculate result |
| GET | `/api/results/my` | Student result history |
| GET | `/api/results/all` | Admin views all results |
| GET | `/api/health` | API health check |

### Example exam creation JSON

```json
{
  "title": "Computer Science Test",
  "description": "Basic programming examination",
  "duration": 30,
  "totalMarks": 10,
  "questions": [
    {
      "questionText": "Which language is used to structure a web page?",
      "options": ["HTML", "Python", "C++", "Java"],
      "correctAnswer": "HTML",
      "marks": 5
    },
    {
      "questionText": "What does CPU stand for?",
      "options": [
        "Central Processing Unit",
        "Computer Personal Unit",
        "Central Program Utility",
        "Control Processing User"
      ],
      "correctAnswer": "Central Processing Unit",
      "marks": 5
    }
  ]
}
```

## 10. Project folder structure

```text
ExamPro_Complete/
├── middleware/
│   ├── admin.js
│   └── auth.js
├── models/
│   ├── Exam.js
│   ├── Result.js
│   └── User.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── routes/
│   ├── auth.js
│   ├── exams.js
│   └── results.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## 11. Troubleshooting

- **MongoDB connection error:** make sure MongoDB service is running and `MONGO_URI` is correct.
- **Port 5000 already in use:** stop the old Node process or change `PORT` in `.env`.
- **401 Unauthorized:** log in again and use the latest token.
- **403 Admin access only:** update the account role in MongoDB and log in again.
- **No exams shown to student:** admin must publish the exam first.
- **Cannot find module:** check that terminal is opened in the project root and run `npm install`.

## 12. Viva explanation

ExamPro is a role-based online examination system. MongoDB stores users, exams and results. Passwords are hashed using bcryptjs. JWT verifies authenticated requests. Admins create and publish MCQ exams. Students can view published exams, attempt timed tests and submit answers. The backend checks answers and calculates marks, percentage, correct, wrong and skipped counts. Correct answers are excluded from student exam API responses.
