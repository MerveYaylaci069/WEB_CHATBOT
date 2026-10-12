const { translateText } = require('../services/translateService');
const logger = require('../utils/logger');

const translate = async (req, res) => {
    const { text, targetLang } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Metin boş olamaz.' });
    }

    try {
        const translated = await translateText(text, targetLang || 'EN');
        res.json({ translated });
    } catch (error) {
        logger.error('Çeviri başarısız', { message: error.message });
        res.status(500).json({ error: 'Çeviri yapılamadı.' });
    }
};

module.exports = { translate };
