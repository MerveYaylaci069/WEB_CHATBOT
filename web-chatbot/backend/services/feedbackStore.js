const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'feedback.json');

function readAll() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
        return [];
    }
}

function writeAll(entries) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

function addFeedback({ siteKey, lang, userMessage, botReply, rating, userAgent }) {
    const entries = readAll();
    entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        siteKey: siteKey || 'default',
        lang: lang || 'TR',
        userMessage: userMessage || '',
        botReply: botReply || '',
        rating,
        userAgent: userAgent || ''
    });
    writeAll(entries);
}

function getFeedback(siteKey) {
    return readAll()
        .filter((e) => e.siteKey === siteKey)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

module.exports = { addFeedback, getFeedback };
