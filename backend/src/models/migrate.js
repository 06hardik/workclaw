const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../../data/workclaw.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'FREELANCER' CHECK(role IN ('CLIENT','FREELANCER','BOTH')),
      name TEXT,
      headline TEXT,
      bio TEXT,
      skills TEXT DEFAULT '[]',
      hourly_rate REAL DEFAULT 0,
      avatar_seed TEXT,
      total_earned REAL DEFAULT 0,
      total_jobs_completed INTEGER DEFAULT 0,
      reputation_score REAL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS job_postings (
      id TEXT PRIMARY KEY,
      client_address TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER,
      budget REAL NOT NULL,
      budget_token TEXT DEFAULT 'USDC',
      scope TEXT,
      skills_required TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','IN_REVIEW','COMPLETED','CANCELLED')),
      on_chain_job_id INTEGER,
      expires_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(client_address) REFERENCES users(wallet_address),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      freelancer_address TEXT NOT NULL,
      cover_letter TEXT NOT NULL,
      bid_amount REAL NOT NULL,
      bid_token TEXT DEFAULT 'USDC',
      estimated_days INTEGER,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
      submitted_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(job_id) REFERENCES job_postings(id),
      FOREIGN KEY(freelancer_address) REFERENCES users(wallet_address),
      UNIQUE(job_id, freelancer_address)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      proposal_id TEXT NOT NULL,
      client_address TEXT NOT NULL,
      freelancer_address TEXT NOT NULL,
      on_chain_job_id INTEGER,
      escrow_amount REAL NOT NULL,
      escrow_token TEXT DEFAULT 'USDC',
      byreal_position_id TEXT,
      yield_client REAL DEFAULT 0,
      yield_freelancer REAL DEFAULT 0,
      yield_split_bps INTEGER DEFAULT 5000,
      deliverable_content TEXT,
      deliverable_hash TEXT,
      ai_score INTEGER,
      ai_reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUBMITTED','COMPLETED','DISPUTED','RESOLVED','CANCELLED')),
      created_at INTEGER DEFAULT (strftime('%s','now')),
      completed_at INTEGER,
      FOREIGN KEY(job_id) REFERENCES job_postings(id),
      FOREIGN KEY(proposal_id) REFERENCES proposals(id),
      FOREIGN KEY(client_address) REFERENCES users(wallet_address),
      FOREIGN KEY(freelancer_address) REFERENCES users(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id TEXT,
      job_id TEXT,
      action_type TEXT NOT NULL,
      reason TEXT,
      on_chain_tx_hash TEXT,
      agent_nft_id INTEGER,
      metadata TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      nonce TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY(contract_id) REFERENCES contracts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_client ON job_postings(client_address);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_postings(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_category ON job_postings(category_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_job ON proposals(job_id);
    CREATE INDEX IF NOT EXISTS idx_proposals_freelancer ON proposals(freelancer_address);
    CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_address);
    CREATE INDEX IF NOT EXISTS idx_contracts_freelancer ON contracts(freelancer_address);
    CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
    CREATE INDEX IF NOT EXISTS idx_contracts_onchain ON contracts(on_chain_job_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions(wallet_address);
  `);

  const cats = [
    ["Web Development", "💻", "Frontend, backend, full-stack web apps"],
    ["Smart Contract Dev", "⛓️", "Solidity, Rust, Web3 development"],
    ["UI/UX Design", "🎨", "User interface and experience design"],
    ["Mobile Development", "📱", "iOS, Android, React Native"],
    ["AI & Machine Learning", "🤖", "ML models, AI integrations, data science"],
    ["DevOps & Cloud", "☁️", "CI/CD, infrastructure, cloud deployment"],
    ["Content Writing", "✍️", "Copywriting, technical writing, blog posts"],
    ["Graphic Design", "🖼️", "Logos, branding, visual design"],
    ["Data Analysis", "📊", "Data visualization, analytics, reporting"],
    ["Cybersecurity", "🔒", "Audits, penetration testing, security reviews"],
  ];

  const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name, icon, description) VALUES (?, ?, ?)");
  cats.forEach(([name, icon, desc]) => insertCat.run(name, icon, desc));

  console.log("✅ Database migrated successfully");
  console.log("📁 Database location:", DB_PATH);
}

migrate();
module.exports = db;
