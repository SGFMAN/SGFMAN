const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE ---
const db = new sqlite3.Database("./sgfman.db");

// Base jobs table (includes all columns used by frontend)
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

// Settings table: frequency + 2 templates
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    emailFrequency TEXT DEFAULT 'Weekly',
    statusTemplate TEXT DEFAULT 'This is the default Job Status Update email.',
    newJobTemplate TEXT DEFAULT 'Welcome! Your new project has been created.'
  )`);

  db.run(
    `INSERT OR IGNORE INTO settings (id, emailFrequency, statusTemplate, newJobTemplate)
     VALUES (1, 'Weekly', 'This is the default Job Status Update email.', 'Welcome! Your new project has been created.')`
  );
});

// --- Defensive migration in case your DB predates the new columns ---
db.all("PRAGMA table_info(settings);", [], (err, cols) => {
  if (err) return console.error("❌ settings schema check:", err.message);
  const names = new Set(cols.map(c => c.name));
  const toAdd = [];
  if (!names.has("emailFrequency")) toAdd.push(`ALTER TABLE settings ADD COLUMN emailFrequency TEXT DEFAULT 'Weekly'`);
  if (!names.has("statusTemplate")) toAdd.push(`ALTER TABLE settings ADD COLUMN statusTemplate TEXT DEFAULT 'This is the default Job Status Update email.'`);
  if (!names.has("newJobTemplate")) toAdd.push(`ALTER TABLE settings ADD COLUMN newJobTemplate TEXT DEFAULT 'Welcome! Your new project has been created.'`);

  toAdd.forEach(sql => db.run(sql, e => {
    if (e) console.error("❌ settings migrate:", e.message);
  }));
});

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

// --- EMAIL HELPERS ---
function sendStatusEmail(job, settings) {
  if (!job.email1) return console.log(`⚠️ Skipped job ${job.id}: no Email1`);
  if ((job.status || "Design Phase") === "Complete") {
    // keep previous behavior (skip complete)
    return console.log(`⚠️ Skipped job ${job.id}: status Complete`);
  }

  const mailOptions = {
    from: "info@superiorgrannyflats.com.au",
    to: job.email1,
    subject: "Superior Granny Flats - Project Update",
    text:
      `Hi ${job.name1 || "Client"},\n\n` +
      `This is an automated update for your project at ${job.address}.\n\n` +
      `Project Status: ${job.status || "Design Phase"}\n\n` +
      `${settings.statusTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(`❌ Status email to ${job.email1}:`, err.message);
    else console.log(`✅ Status email sent to ${job.email1}:`, info.response);
  });
}

function sendNewJobEmail(job, settings) {
  if (!job.email1) return console.log(`⚠️ Skipped NEW job ${job.id}: no Email1`);

  const mailOptions = {
    from: "info@superiorgrannyflats.com.au",
    to: job.email1,
    subject: "Superior Granny Flats - New Project Created",
    text:
      `Hi ${job.name1 || "Client"},\n\n` +
      `A new project has been created for ${job.address}.\n\n` +
      `Current Status: ${job.status || "Design Phase"}\n\n` +
      `${settings.newJobTemplate || ""}\n\n` +
      `Thanks,\n\nThe Superior Team`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error(`❌ New Job email to ${job.email1}:`, err.message);
    else console.log(`✅ New Job email sent to ${job.email1}:`, info.response);
  });
}

// --- CRON JOBS (Status updates only) ---
let currentTask = null;
function scheduleEmails(freq) {
  if (currentTask) currentTask.stop();

  let cronExpr = "0 9 * * 1"; // default weekly
  if (freq === "Every 2 Minutes") cronExpr = "*/2 * * * *";
  if (freq === "Daily") cronExpr = "0 9 * * *";
  if (freq === "Weekly") cronExpr = "0 9 * * 1";
  if (freq === "Monthly") cronExpr = "0 9 1 * *";

  console.log("📅 Scheduling emails:", freq, "→ cron:", cronExpr);

  currentTask = cron.schedule(cronExpr, () => {
    console.log("⏰ Cron triggered (Status Updates)...");
    db.get("SELECT * FROM settings WHERE id=1", [], (err, settingsRow) => {
      if (err) return console.error("❌ Error reading settings:", err.message);
      db.all("SELECT * FROM jobs", [], (err2, rows) => {
        if (err2) return console.error("❌ Error reading jobs:", err2.message);
        console.log(`📋 Found ${rows.length} jobs in DB for status updates`);
        rows.forEach((job) => sendStatusEmail(job, settingsRow));
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      job.address,
      job.finish,
      job.class,
      job.name1,
      job.name2,
      job.email1,
      job.email2,
      job.notes || "",
      job.price,
      job.date,
      job.colors,
      job.windows,
      job.contract,
      job.status || "Design Phase",
      job.depositAmount || "",
      job.conceptDrawingsConfirmed || "No",
      job.workingDrawingsConfirmed || "No",
      job.energyReport || "No",
    ],
    function (err) {
      if (err) {
        console.error("❌ Error inserting job:", err.message);
        return res.status(400).json({ error: err.message });
      }
      db.get("SELECT * FROM jobs WHERE id=?", [this.lastID], (e, row) => {
        if (e) {
          console.error("❌ Error fetching new job:", e.message);
          return res.status(500).json({ error: e.message });
        }
        // Fire NEW JOB email (one-off)
        db.get("SELECT * FROM settings WHERE id=1", [], (errS, settingsRow) => {
          if (errS) console.error("❌ Settings read (new job email):", errS.message);
          else {
            console.log("📧 Sending New Job email...");
            sendNewJobEmail(row, settingsRow);
          }
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
      job.address,
      job.finish,
      job.class,
      job.name1,
      job.name2,
      job.email1,
      job.email2,
      job.notes || "",
      job.price,
      job.date,
      job.colors,
      job.windows,
      job.contract,
      job.status || "Design Phase",
      job.depositAmount || "",
      job.conceptDrawingsConfirmed || "No",
      job.workingDrawingsConfirmed || "No",
      job.energyReport || "No",
      req.params.id,
    ],
    function (err) {
      if (err) {
        console.error("❌ Error updating job:", err.message);
        return res.status(400).json({ error: err.message });
      }
      db.get("SELECT * FROM jobs WHERE id=?", [req.params.id], (e, row) => {
        if (e) {
          console.error("❌ Error fetching updated job:", e.message);
          return res.status(500).json({ error: e.message });
        }
        res.json(row);
      });
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
  const { emailFrequency, statusTemplate, newJobTemplate } = req.body;
  db.run(
    `UPDATE settings SET emailFrequency=?, statusTemplate=?, newJobTemplate=? WHERE id=1`,
    [emailFrequency, statusTemplate, newJobTemplate],
    function (err) {
      if (err) {
        console.error("❌ Error updating settings:", err.message);
        return res.status(400).json({ error: err.message });
      }
      scheduleEmails(emailFrequency);
      res.json({ emailFrequency, statusTemplate, newJobTemplate });
    }
  );
});

// Test email (optional: test type = 'status' | 'new')
app.post("/api/test-email", (req, res) => {
  const { to, type = "status" } = req.body;
  if (!to) return res.status(400).json({ error: "Missing 'to' address" });

  db.get("SELECT * FROM settings WHERE id=1", [], (err, settingsRow) => {
    if (err) return res.status(500).json({ error: err.message });

    const jobDemo = { address: "123 Example St", name1: "Client", status: "Design Phase", email1: to };
    if (type === "new") {
      sendNewJobEmail(jobDemo, settingsRow);
      return res.json({ ok: true, type: "new" });
    } else {
      sendStatusEmail(jobDemo, settingsRow);
      return res.json({ ok: true, type: "status" });
    }
  });
});


const path = require("path");

// Serve React frontend
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});


// --- START SERVER ---
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
  db.get("SELECT emailFrequency FROM settings WHERE id=1", [], (err, row) => {
    if (!err && row) scheduleEmails(row.emailFrequency);
  });
});
