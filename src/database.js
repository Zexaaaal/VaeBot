const Database = require('better-sqlite3');
const path = require('path');

const fs = require('fs');

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

    db.exec(`
    CREATE TABLE IF NOT EXISTS oscars_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      is_revealed INTEGER DEFAULT 0
    );
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS oscars_nominees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      discord_id TEXT,
      FOREIGN KEY (category_id) REFERENCES oscars_categories (id)
    );
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS oscars_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      voter_cookie_id TEXT,
      nominee_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES oscars_categories (id),
      FOREIGN KEY (nominee_id) REFERENCES oscars_nominees (id),
      UNIQUE(category_id, voter_cookie_id)
    );
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS global_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function getGlobalState(key) {
    const row = db.prepare('SELECT value FROM global_state WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
}

function setGlobalState(key, value) {
    db.prepare('INSERT OR REPLACE INTO global_state (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}

function deleteGlobalState(key) {
    db.prepare('DELETE FROM global_state WHERE key = ?').run(key);
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
    return db.prepare('SELECT * FROM modifications WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)').all(userId, now);
}

function updateBaseQi(userId, amount) {
    const user = getUserInfo(userId);
    const newQi = user.base_qi + amount;
    db.prepare('UPDATE users SET base_qi = ? WHERE id = ?').run(newQi, userId);
    return newQi;
}

function setBaseQi(userId, targetQi) {
    getUserInfo(userId); // ensure exists
    db.prepare('UPDATE users SET base_qi = ? WHERE id = ?').run(targetQi, userId);
    return targetQi;
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

function getOscarsCategories() {
    return db.prepare('SELECT * FROM oscars_categories WHERE is_active = 1').all();
}

function getOscarsNominees(categoryId) {
    return db.prepare('SELECT * FROM oscars_nominees WHERE category_id = ?').all(categoryId);
}

function addOscarsVote(categoryId, cookieId, nomineeId) {
    return db.prepare('INSERT OR REPLACE INTO oscars_votes (category_id, voter_cookie_id, nominee_id) VALUES (?, ?, ?)').run(categoryId, cookieId, nomineeId);
}

function hasVoted(categoryId, cookieId) {
    const vote = db.prepare('SELECT id FROM oscars_votes WHERE category_id = ? AND voter_cookie_id = ?').get(categoryId, cookieId);
    return !!vote;
}

function getOscarsResults(categoryId) {
    return db.prepare(`
        SELECT n.id, n.name, n.discord_id, COUNT(v.id) as vote_count
        FROM oscars_nominees n
        LEFT JOIN oscars_votes v ON n.id = v.nominee_id
        WHERE n.category_id = ?
        GROUP BY n.id
        ORDER BY vote_count DESC
    `).all(categoryId);
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
    setBaseQi,
    calculateTotalQi,
    getAllUsers,
    getLast7DaysLosses,
    getFirstRollTimestamp,
    getOscarsCategories,
    getOscarsNominees,
    addOscarsVote,
    hasVoted,
    getOscarsResults,
    getGlobalState,
    setGlobalState,
    deleteGlobalState
};
