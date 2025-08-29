const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./sgfman.db");

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT,
      finish TEXT,
      class TEXT,
      name1 TEXT,
      name2 TEXT,
      email1 TEXT,
      email2 TEXT,
      notes TEXT,
      price INTEGER,     -- whole dollars only
      date TEXT,
      colors TEXT,
      windows TEXT,
      contract TEXT
    )
  `);
});

module.exports = db;
