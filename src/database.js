const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');

// Use Render's persistent disk if available, otherwise local
const dataDir = fs.existsSync('/data') ? '/data' : path.resolve(__dirname, '..');
const dbPath = path.join(dataDir, 'data.sqlite');
const db = new Database(dbPath, { verbose: console.log });

function initDb() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      base_qi INTEGER DEFAULT 0,
      last_roll_date TEXT
    );
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS modifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      value INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);
}

function getUserInfo(userId) {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
        db.prepare('INSERT INTO users (id, base_qi) VALUES (?, ?)').run(userId, 0);
        user = { id: userId, base_qi: 0, last_roll_date: null };
    }
    return user;
}

function updateUserRollDate(userId, dateStr) {
    db.prepare('UPDATE users SET last_roll_date = ? WHERE id = ?').run(dateStr, userId);
}

function clearAllRollDates() {
    db.prepare('UPDATE users SET last_roll_date = NULL').run();
}

function resetAllQi() {
    db.prepare('UPDATE users SET base_qi = 0').run();
    db.prepare('DELETE FROM modifications').run();
}

function addModification(userId, value, reason, expiresAt = null) {
    db.prepare('INSERT INTO modifications (user_id, value, reason, expires_at) VALUES (?, ?, ?, ?)').run(userId, value, reason, expiresAt);
}

function getActiveModifications(userId) {
    const now = new Date().toISOString();
    // Get modifications that haven't expired OR have no expiration date (permanent like vote results? Actually vote results might be permanent base_qi change or permanent modification. The prompt says "sauvegardé". "Je quitte, je reviens, 50". Let's make votes change the \`base_qi\` directly, while daily rolls create a temporary modification.)
    return db.prepare('SELECT * FROM modifications WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)').all(userId, now);
}

function updateBaseQi(userId, amount) {
    const user = getUserInfo(userId);
    const newQi = user.base_qi + amount;
    db.prepare('UPDATE users SET base_qi = ? WHERE id = ?').run(newQi, userId);
    return newQi;
}

function calculateTotalQi(userId) {
    const user = getUserInfo(userId);
    const mods = getActiveModifications(userId);
    let total = user.base_qi;
    for (const mod of mods) {
        total += mod.value;
    }
    return total;
}

function getAllUsers() {
    return db.prepare('SELECT * FROM users').all();
}

function getLast7DaysLosses(userId) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = db.prepare(`
        SELECT COALESCE(SUM(value), 0) as total_loss
        FROM modifications
        WHERE user_id = ? AND value < 0 AND created_at >= ?
    `).get(userId, sevenDaysAgo);
    return result.total_loss;
}

function getFirstRollTimestamp() {
    const result = db.prepare(`SELECT MIN(last_roll_date) as first_roll FROM users WHERE last_roll_date IS NOT NULL`).get();
    return result?.first_roll || null;
}

module.exports = {
    db,
    initDb,
    getUserInfo,
    updateUserRollDate,
    clearAllRollDates,
    resetAllQi,
    addModification,
    getActiveModifications,
    updateBaseQi,
    calculateTotalQi,
    getAllUsers,
    getLast7DaysLosses,
    getFirstRollTimestamp
};
