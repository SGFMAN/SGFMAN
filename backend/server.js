const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE ---
const db = new Database("./sgfman.db");

// Ensure jobs table exists
db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT,
  finish TEXT,
  class TEXT,
  name1 TEXT,
  name2 TEXT,
  email1 TEXT,
  email2 TEXT,
  notes TEXT,
  price TEXT,
  date TEXT,
  colors TEXT,
  windows TEXT,
  contract TEXT,
  status TEXT DEFAULT 'Design Phase',
  depositAmount TEXT DEFAULT '',
  conceptDrawingsConfirmed TEXT DEFAULT 'No',
  workingDrawingsConfirmed TEXT DEFAULT 'No',
  energyReport TEXT DEFAULT 'No'
)`).run();

// Ensure settings table exists
db.prepare(`CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  emailFrequency TEXT DEFAULT 'Weekly',
  emailTemplate TEXT DEFAULT 'This is the default status update email.',
  newJobTemplate TEXT DEFAULT 'This is the default new job email.'
)`).run();

// Ensure row exists
db.prepare(
  `INSERT OR IGNORE INTO settings (id, emailFrequency, emailTemplate, newJobTemplate)
   VALUES (1, 'Weekly', 'This is the default status update email.', 'This is the default new job email.')`
).run();

// --- EMAIL TRANSPORT ---
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@superiorgrannyflats.com.au",
    pass: "Granny2021",
  },
});

// --- HELPERS ---
function sendJobEmail(job, settings, type = "status") {
  if (!job.email1) return console.log(`Skipped ${job.id}: no Email1`);
  if ((job.status || "Design Phase") === "Complete" && type === "status") {
    return console.log(`Skipped ${job.id}: Complete`);
  }

  let bodyText = "";
  if (type === "status") {
    bodyText =
      `Hi ${job.name1 || "Client"},\n\n` +
      `This is an automated update for your project at ${job.address}.\n\n` +
      `Project Status: ${job.status || "Design Phase"}\n\n` +
      `${settings.emailTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`;
  } else if (type === "new") {
    bodyText =
      `Hi ${job.name1 || "Client"},\n\n` +
      `Thank you for starting a new project with Superior Granny Flats.\n\n` +
      `Project Address: ${job.address}\n\n` +
      `${settings.newJobTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`;
  }

  const mailOptions = {
    from: "info@superiorgrannyflats.com.au",
    to: job.email1,
    subject:
      type === "status"
        ? "Superior Granny Flats - Project Update"
        : "Superior Granny Flats - New Project",
    text: bodyText,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("❌ Error sending email:", err.message);
    else console.log("✅ Email sent:", info.response);
  });
}

// --- CRON JOBS ---
let currentTask = null;
function scheduleEmails(freq) {
  if (currentTask) currentTask.stop();

  let cronExpr = "0 9 * * 1"; // Weekly default
  if (freq === "Every 2 Minutes") cronExpr = "*/2 * * * *";
  if (freq === "Daily") cronExpr = "0 9 * * *";
  if (freq === "Weekly") cronExpr = "0 9 * * 1";
  if (freq === "Monthly") cronExpr = "0 9 1 * *";

  console.log("📅 Scheduling emails:", freq);

  currentTask = cron.schedule(cronExpr, () => {
    const settingsRow = db.prepare("SELECT * FROM settings WHERE id=1").get();
    const jobs = db.prepare("SELECT * FROM jobs").all();
    jobs.forEach((job) => sendJobEmail(job, settingsRow, "status"));
  });
}

// --- API ROUTES ---

// Jobs
app.get("/api/jobs", (req, res) => {
  const rows = db.prepare("SELECT * FROM jobs").all();
  res.json(rows);
});

app.post("/api/jobs", (req, res) => {
  const job = req.body;

  const stmt = db.prepare(`INSERT INTO jobs
    (address, finish, class, name1, name2, email1, email2, notes, price, date,
     colors, windows, contract, status, depositAmount,
     conceptDrawingsConfirmed, workingDrawingsConfirmed, energyReport)
    VALUES (@address, @finish, @class, @name1, @name2, @email1, @email2, @notes,
            @price, @date, @colors, @windows, @contract, @status, @depositAmount,
            @conceptDrawingsConfirmed, @workingDrawingsConfirmed, @energyReport)`);

  const result = stmt.run(job);
  const newJob = db.prepare("SELECT * FROM jobs WHERE id = ?").get(result.lastInsertRowid);

  // Send "new job" email immediately
  const settingsRow = db.prepare("SELECT * FROM settings WHERE id=1").get();
  sendJobEmail(newJob, settingsRow, "new");

  res.json(newJob);
});

app.put("/api/jobs/:id", (req, res) => {
  const job = { ...req.body, id: req.params.id };

  db.prepare(`UPDATE jobs SET
    address=@address, finish=@finish, class=@class,
    name1=@name1, name2=@name2, email1=@email1, email2=@email2,
    notes=@notes, price=@price, date=@date,
    colors=@colors, windows=@windows, contract=@contract,
    status=@status, depositAmount=@depositAmount,
    conceptDrawingsConfirmed=@conceptDrawingsConfirmed,
    workingDrawingsConfirmed=@workingDrawingsConfirmed,
    energyReport=@energyReport
    WHERE id=@id`).run(job);

  const updated = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  res.json(updated);
});

app.delete("/api/jobs/:id", (req, res) => {
  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  res.json({ deletedID: req.params.id });
});

// Settings
app.get("/api/settings", (req, res) => {
  const row = db.prepare("SELECT * FROM settings WHERE id=1").get();
  res.json(row);
});

app.put("/api/settings", (req, res) => {
  const { emailFrequency, emailTemplate, newJobTemplate } = req.body;
  db.prepare(`UPDATE settings SET emailFrequency=?, emailTemplate=?, newJobTemplate=? WHERE id=1`)
    .run(emailFrequency, emailTemplate, newJobTemplate);

  scheduleEmails(emailFrequency);
  res.json({ emailFrequency, emailTemplate, newJobTemplate });
});

// Serve frontend (for Render)
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

// --- START SERVER ---
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");

  const row = db.prepare("SELECT emailFrequency FROM settings WHERE id=1").get();
  if (row) scheduleEmails(row.emailFrequency);
});
