const conversationStore = require('../services/conversationStore');
const logger = require('../utils/logger');

// Admin: bir sitedeki tüm ziyaretçilerin özet listesi (kim kimle konuşmuş).
const listConversations = (req, res) => {
    const { siteKey } = req.params;
    const conversations = conversationStore.listConversationsBySite(siteKey);
    res.json({ conversations });
};

// Admin veya widget'ın kendisi: tek bir ziyaretçinin tam transkripti.
const getConversation = (req, res) => {
    const { siteKey, visitorId } = req.params;
    const entries = conversationStore.getConversation(siteKey, visitorId);
    res.json({ entries });
};

const deleteConversation = (req, res) => {
    const { siteKey, visitorId } = req.params;
    try {
        conversationStore.deleteConversation(siteKey, visitorId);
        res.json({ ok: true });
    } catch (error) {
        logger.error('Konuşma silinemedi', { error: error.message });
        res.status(500).json({ error: 'Konuşma silinemedi.' });
    }
};

const deleteAllForSite = (req, res) => {
    const { siteKey } = req.params;
    try {
        conversationStore.deleteAllForSite(siteKey);
        res.json({ ok: true });
    } catch (error) {
        logger.error('Konuşmalar silinemedi', { error: error.message });
        res.status(500).json({ error: 'Konuşmalar silinemedi.' });
    }
};

module.exports = { listConversations, getConversation, deleteConversation, deleteAllForSite };
