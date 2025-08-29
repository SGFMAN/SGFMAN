const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./sgfman.db");

db.run("DROP TABLE IF EXISTS settings", (err) => {
  if (err) {
    console.error("❌ Error dropping settings table:", err.message);
  } else {
    console.log("✅ Settings table dropped. Restart your server to recreate it.");
  }
  db.close();
});
