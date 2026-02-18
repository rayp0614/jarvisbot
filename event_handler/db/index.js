/**
 * SQLite database for persistent storage
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'jarvisbot.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  -- Job history
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    description TEXT,
    status TEXT DEFAULT 'created',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    result TEXT,
    pr_url TEXT
  );

  -- Chat messages
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Activity log
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
  CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);
`);

// Prepared statements for common operations
const statements = {
  // Jobs
  insertJob: db.prepare(`
    INSERT INTO jobs (id, description, status) VALUES (?, ?, ?)
  `),
  updateJobStatus: db.prepare(`
    UPDATE jobs SET status = ?, completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = ?
  `),
  updateJobResult: db.prepare(`
    UPDATE jobs SET result = ?, pr_url = ? WHERE id = ?
  `),
  getJob: db.prepare(`SELECT * FROM jobs WHERE id = ?`),
  getRecentJobs: db.prepare(`
    SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?
  `),
  getJobsToday: db.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE date(created_at) = date('now')
  `),
  getJobStats: db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status IN ('in_progress', 'queued', 'created') THEN 1 ELSE 0 END) as running
    FROM jobs WHERE created_at > datetime('now', '-7 days')
  `),

  // Activity
  insertActivity: db.prepare(`
    INSERT INTO activity (type, description) VALUES (?, ?)
  `),
  getRecentActivity: db.prepare(`
    SELECT * FROM activity ORDER BY timestamp DESC LIMIT ?
  `),

  // Messages
  insertMessage: db.prepare(`
    INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)
  `),
  getMessages: db.prepare(`
    SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?
  `),
};

// Database API
const dbApi = {
  // Jobs
  createJob(id, description) {
    statements.insertJob.run(id, description, 'created');
    this.logActivity('job_created', `Job ${id.slice(0, 8)} created`);
  },

  updateJobStatus(id, status) {
    statements.updateJobStatus.run(status, status, id);
    if (status === 'completed') {
      this.logActivity('job_completed', `Job ${id.slice(0, 8)} completed`);
    } else if (status === 'failed') {
      this.logActivity('job_failed', `Job ${id.slice(0, 8)} failed`);
    }
  },

  updateJobResult(id, result, prUrl) {
    statements.updateJobResult.run(result, prUrl, id);
  },

  getJob(id) {
    return statements.getJob.get(id);
  },

  getRecentJobs(limit = 50) {
    return statements.getRecentJobs.all(limit);
  },

  getJobStats() {
    const stats = statements.getJobStats.get();
    const today = statements.getJobsToday.get();
    return {
      ...stats,
      today: today.count,
      successRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  },

  // Activity
  logActivity(type, description) {
    statements.insertActivity.run(type, description);
  },

  getRecentActivity(limit = 20) {
    return statements.getRecentActivity.all(limit);
  },

  // Messages
  saveMessage(chatId, role, content) {
    statements.insertMessage.run(chatId, role, content);
  },

  getMessages(chatId, limit = 50) {
    return statements.getMessages.all(chatId, limit);
  },
};

module.exports = dbApi;
