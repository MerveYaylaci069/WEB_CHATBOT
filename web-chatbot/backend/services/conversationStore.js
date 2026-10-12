const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'conversations.json');

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

// visitorId: kullanıcı girişi olmadığı için gerçek kimlik değil, widget'ın tarayıcıda
// localStorage'a yazdığı anonim bir cihaz kimliğidir (bkz. frontend visitorId üretimi).
function addTurn({ siteKey, visitorId, lang, userMessage, botReply }) {
    if (!visitorId) return; // visitorId yoksa (ör. admin canlı test) hiç kaydetme
    const entries = readAll();
    entries.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        siteKey: siteKey || 'default',
        visitorId,
        lang: lang || 'TR',
        userMessage: userMessage || '',
        botReply: botReply || ''
    });
    writeAll(entries);
}

// Admin görünümü: siteye ait her ziyaretçi için özet (mesaj sayısı, ilk/son görülme).
function listConversationsBySite(siteKey) {
    const entries = readAll().filter((e) => e.siteKey === siteKey);
    const byVisitor = new Map();
    for (const e of entries) {
        const existing = byVisitor.get(e.visitorId);
        if (!existing) {
            byVisitor.set(e.visitorId, {
                visitorId: e.visitorId,
                messageCount: 1,
                firstSeen: e.timestamp,
                lastSeen: e.timestamp,
                lastMessage: e.userMessage
            });
        } else {
            existing.messageCount += 1;
            if (e.timestamp < existing.firstSeen) existing.firstSeen = e.timestamp;
            if (e.timestamp > existing.lastSeen) {
                existing.lastSeen = e.timestamp;
                existing.lastMessage = e.userMessage;
            }
        }
    }
    return Array.from(byVisitor.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

// Kullanıcının kendi widget'ında "eski sohbetlerim" için, ya da admin'in tek bir
// ziyaretçinin tüm konuşmasını okuması için: tam transkript, kronolojik sırayla.
function getConversation(siteKey, visitorId) {
    return readAll()
        .filter((e) => e.siteKey === siteKey && e.visitorId === visitorId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function deleteConversation(siteKey, visitorId) {
    const entries = readAll().filter((e) => !(e.siteKey === siteKey && e.visitorId === visitorId));
    writeAll(entries);
}

function deleteAllForSite(siteKey) {
    const entries = readAll().filter((e) => e.siteKey !== siteKey);
    writeAll(entries);
}

module.exports = { addTurn, listConversationsBySite, getConversation, deleteConversation, deleteAllForSite };
