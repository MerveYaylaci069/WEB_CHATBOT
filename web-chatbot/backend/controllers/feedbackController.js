const feedbackStore = require('../services/feedbackStore');
const logger = require('../utils/logger');

const submitFeedback = (req, res) => {
    const { siteKey, lang, userMessage, botReply, rating, userAgent } = req.body;

    if (!rating || !['up', 'down'].includes(rating)) {
        return res.status(400).json({ error: 'Geçersiz değerlendirme.' });
    }

    try {
        // userAgent sadece destek amaçlı (kullanıcı sorun bildirdiğinde hangi tarayıcı/cihazda
        // olduğunu görebilmek için) — IP veya başka bir kişisel veri kaydedilmiyor.
        const safeUserAgent = typeof userAgent === 'string' ? userAgent.slice(0, 300) : '';
        feedbackStore.addFeedback({ siteKey, lang, userMessage, botReply, rating, userAgent: safeUserAgent });
        res.json({ ok: true });
    } catch (error) {
        logger.error('Geri bildirim kaydedilemedi', { error: error.message });
        res.status(500).json({ error: 'Geri bildirim kaydedilemedi.' });
    }
};

const listFeedback = (req, res) => {
    const { siteKey } = req.params;
    const entries = feedbackStore.getFeedback(siteKey);
    const summary = {
        total: entries.length,
        up: entries.filter((e) => e.rating === 'up').length,
        down: entries.filter((e) => e.rating === 'down').length
    };
    res.json({ summary, entries });
};

module.exports = { submitFeedback, listFeedback };
