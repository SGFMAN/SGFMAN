const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE ---
const db = new sqlite3.Database("./sgfman.db");

// Jobs table
db.run(`CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT,
  finish TEXT,
  class TEXT,
  name1 TEXT,
  name2 TEXT,
  email1 TEXT,
  email2 TEXT,
  notes TEXT,
  price INTEGER,
  date TEXT,
  colors TEXT,
  windows TEXT,
  contract TEXT,
  status TEXT DEFAULT 'Design Phase',
  depositAmount TEXT DEFAULT '',
  conceptDrawingsConfirmed TEXT DEFAULT 'No',
  workingDrawingsConfirmed TEXT DEFAULT 'No',
  energyReport TEXT DEFAULT 'No'
)`);

// Settings table
db.run(`CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  emailFrequency TEXT DEFAULT 'Weekly',
  emailTemplate TEXT DEFAULT 'This is the default job status update email.',
  newJobTemplate TEXT DEFAULT 'This is the default new job email.'
)`);
db.run(
  `INSERT OR IGNORE INTO settings (id, emailFrequency, emailTemplate, newJobTemplate) 
   VALUES (1, 'Weekly', 'This is the default job status update email.', 'This is the default new job email.')`
);

// --- AUTO-MIGRATION for settings table ---
const requiredSettingsColumns = [
  { name: "emailFrequency", def: "TEXT DEFAULT 'Weekly'" },
  { name: "emailTemplate", def: "TEXT DEFAULT 'This is the default job status update email.'" },
  { name: "newJobTemplate", def: "TEXT DEFAULT 'This is the default new job email.'" }
];

db.all("PRAGMA table_info(settings);", [], (err, columns) => {
  if (err) return console.error("❌ Error checking settings schema:", err.message);

  requiredSettingsColumns.forEach((col) => {
    if (!columns.some((c) => c.name === col.name)) {
      console.log(`⚙️ Adding missing settings column '${col.name}'...`);
      db.run(
        `ALTER TABLE settings ADD COLUMN ${col.name} ${col.def}`,
        (err2) => {
          if (err2) console.error(`❌ Error adding column ${col.name}:`, err2.message);
          else console.log(`✅ Column '${col.name}' added to settings table.`);
        }
      );
    }
  });
});

// --- EMAIL TRANSPORT ---
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@superiorgrannyflats.com.au",
    pass: "Granny2021"
  }
});

// --- HELPERS ---
function sendJobStatusEmail(job, settings) {
  if (!job.email1) return console.log(`Skipped ${job.id}: no Email1`);
  if ((job.status || "Design Phase") === "Complete")
    return console.log(`Skipped ${job.id}: Complete`);

  const mailOptions = {
    from: "info@superiorgrannyflats.com.au",
    to: job.email1,
    subject: "Superior Granny Flats - Project Update",
    text:
      `Hi ${job.name1 || "Client"},\n\n` +
      `This is an automated update for your project at ${job.address}.\n\n` +
      `Project Status: ${job.status || "Design Phase"}\n\n` +
      `${settings.emailTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("❌ Error sending status email:", err.message);
    else console.log("✅ Status email sent:", info.response);
  });
}

function sendNewJobEmail(job, settings) {
  if (!job.email1) return console.log(`Skipped new job email for ${job.id}: no Email1`);

  const mailOptions = {
    from: "info@superiorgrannyflats.com.au",
    to: job.email1,
    subject: "Superior Granny Flats - New Project Created",
    text:
      `Hi ${job.name1 || "Client"},\n\n` +
      `Your new project at ${job.address} has been created in our system.\n\n` +
      `${settings.newJobTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error("❌ Error sending new job email:", err.message);
    else console.log("✅ New job email sent:", info.response);
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
    db.get("SELECT * FROM settings WHERE id=1", [], (err, settingsRow) => {
      if (err) return console.error("❌ Error reading settings:", err.message);
      db.all("SELECT * FROM jobs", [], (err2, rows) => {
        if (!err2 && rows.length) {
          rows.forEach((job) => sendJobStatusEmail(job, settingsRow));
        }
      });
    });
  });
}

// --- API ROUTES ---
// Jobs
app.get("/api/jobs", (req, res) => {
  db.all("SELECT * FROM jobs", [], (err, rows) => {
    if (err) res.status(400).json(err);
    else res.json(rows);
  });
});

app.post("/api/jobs", (req, res) => {
  const job = req.body;
  db.run(
    `INSERT INTO jobs 
    (address, finish, class, name1, name2, email1, email2, notes, price, date, colors, windows, contract, status,
     depositAmount, conceptDrawingsConfirmed, workingDrawingsConfirmed, energyReport) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.address, job.finish, job.class, job.name1, job.name2,
      job.email1, job.email2, job.notes || "", job.price, job.date,
      job.colors, job.windows, job.contract, job.status || "Design Phase",
      job.depositAmount || "", job.conceptDrawingsConfirmed || "No",
      job.workingDrawingsConfirmed || "No", job.energyReport || "No"
    ],
    function (err) {
      if (err) return res.status(400).json(err);

      db.get("SELECT * FROM jobs WHERE id=?", [this.lastID], (e, row) => {
        if (e) return res.status(400).json(e);

        // Send new job email
        db.get("SELECT * FROM settings WHERE id=1", [], (err2, settingsRow) => {
          if (!err2 && settingsRow) sendNewJobEmail(row, settingsRow);
        });

        res.json(row);
      });
    }
  );
});

app.put("/api/jobs/:id", (req, res) => {
  const job = req.body;
  db.run(
    `UPDATE jobs SET 
      address=?, finish=?, class=?, name1=?, name2=?, email1=?, email2=?, notes=?, price=?, date=?, colors=?, windows=?, contract=?, status=?,
      depositAmount=?, conceptDrawingsConfirmed=?, workingDrawingsConfirmed=?, energyReport=?
      WHERE id=?`,
    [
      job.address, job.finish, job.class, job.name1, job.name2,
      job.email1, job.email2, job.notes || "", job.price, job.date,
      job.colors, job.windows, job.contract, job.status || "Design Phase",
      job.depositAmount || "", job.conceptDrawingsConfirmed || "No",
      job.workingDrawingsConfirmed || "No", job.energyReport || "No",
      req.params.id
    ],
    function (err) {
      if (err) res.status(400).json(err);
      else db.get("SELECT * FROM jobs WHERE id=?", [req.params.id], (e, row) => res.json(row));
    }
  );
});

app.delete("/api/jobs/:id", (req, res) => {
  db.run(`DELETE FROM jobs WHERE id=?`, req.params.id, function (err) {
    if (err) res.status(400).json(err);
    else res.json({ deletedID: req.params.id });
  });
});

// Settings
app.get("/api/settings", (req, res) => {
  db.get("SELECT * FROM settings WHERE id=1", [], (err, row) => {
    if (err) res.status(400).json(err);
    else res.json(row);
  });
});

app.put("/api/settings", (req, res) => {
  const { emailFrequency, emailTemplate, newJobTemplate } = req.body;
  db.run(
    `UPDATE settings SET emailFrequency=?, emailTemplate=?, newJobTemplate=? WHERE id=1`,
    [emailFrequency, emailTemplate, newJobTemplate],
    function (err) {
      if (err) res.status(400).json(err);
      else {
        scheduleEmails(emailFrequency);
        res.json({ emailFrequency, emailTemplate, newJobTemplate });
      }
    }
  );
});

// Test email
app.post("/api/test-email", (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: "Missing 'to' address" });

  db.get("SELECT * FROM settings WHERE id=1", [], (err, settingsRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const mailOptions = {
      from: "info@superiorgrannyflats.com.au",
      to,
      subject: "Superior Granny Flats - Project Update (Test)",
      text:
        "Hello,\n\nThis is a test email from SGFMAN.\n\n" +
        `Project Status: Design Phase\n\n` +
        `${settingsRow.emailTemplate}\n\n` +
        "Thanks,\n\nThe Superior Team"
    };

    transporter.sendMail(mailOptions, (err2, info) => {
      if (err2) res.status(500).json({ ok: false, error: err2.message });
      else res.json({ ok: true, response: info.response });
    });
  });
});

// --- SERVE FRONTEND BUILD (for Render) ---
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// --- START SERVER ---
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  db.get("SELECT emailFrequency FROM settings WHERE id=1", [], (err, row) => {
    if (!err && row) scheduleEmails(row.emailFrequency);
  });
});
