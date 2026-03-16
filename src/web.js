const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { getOscarsCategories, getOscarsNominees, addOscarsVote, hasVoted } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to assign a unique ID to voters (cookie-based)
app.use((req, res, next) => {
    if (!req.cookies.voter_id) {
        const voterId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        res.cookie('voter_id', voterId, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        req.voter_id = voterId;
    } else {
        req.voter_id = req.cookies.voter_id;
    }
    next();
});

// API Endpoints
app.get('/api/categories', (req, res) => {
    const categories = getOscarsCategories();
    res.json(categories);
});

app.get('/api/categories/:id/nominees', (req, res) => {
    const nominees = getOscarsNominees(parseInt(req.params.id));
    const alreadyVoted = hasVoted(parseInt(req.params.id), req.voter_id);
    res.json({ nominees, alreadyVoted });
});

app.post('/api/vote', (req, res) => {
    const { categoryId, nomineeId } = req.body;
    if (!categoryId || !nomineeId) return res.status(400).json({ error: 'Missing categoryId or nomineeId' });

    if (hasVoted(categoryId, req.voter_id)) {
        return res.status(403).json({ error: 'Already voted in this category' });
    }

    addOscarsVote(categoryId, req.voter_id, nomineeId);
    res.json({ success: true });
});

function startWebServer() {
    app.listen(PORT, '::', () => {
        console.log(`Web server running on port ${PORT} (IPv6/IPv4)`);
    });
}

module.exports = { startWebServer };
