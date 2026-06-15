const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../../data/workclaw.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

module.exports = { getDb };
