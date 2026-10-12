const llmSettingsStore = require('../services/llmSettingsStore');
const logger = require('../utils/logger');

const getSettings = (req, res) => {
    res.json(llmSettingsStore.getPublicSettings());
};

const updateSettings = (req, res) => {
    try {
        llmSettingsStore.saveSettings(req.body);
        res.json(llmSettingsStore.getPublicSettings());
    } catch (error) {
        logger.error('LLM ayarları kaydedilemedi', { message: error.message });
        res.status(500).json({ error: 'Ayarlar kaydedilemedi.' });
    }
};

module.exports = { getSettings, updateSettings };
