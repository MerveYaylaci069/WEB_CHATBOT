const configStore = require('../services/configStore');
const logger = require('../utils/logger');

// GET /api/config/:siteKey — widget'ın kullandığı, systemPrompt İÇERMEYEN uç.
const getWidgetConfig = (req, res) => {
    const { siteKey } = req.params;
    res.json(configStore.getPublicConfig(siteKey));
};

// GET /api/config/:siteKey/admin — admin panelinin düzenleme için okuduğu tam config.
const getAdminConfig = (req, res) => {
    const { siteKey } = req.params;
    res.json(configStore.getConfig(siteKey));
};

// POST /api/config/:siteKey — admin panelinin kaydettiği tam config.
const updateConfig = (req, res) => {
    const { siteKey } = req.params;
    try {
        const updated = configStore.saveConfig(siteKey, req.body);
        res.json(updated);
    } catch (error) {
        logger.error('Config kaydedilemedi', { siteKey, error: error.message });
        res.status(500).json({ error: 'Ayarlar kaydedilemedi.' });
    }
};

// GET /api/config — admin panelindeki site seçici için, tüm sitelerin hafif özeti.
const listSites = (req, res) => {
    res.json(configStore.listSites());
};

// DELETE /api/config/:siteKey — bir siteyi tamamen kaldırır.
const deleteSite = (req, res) => {
    const { siteKey } = req.params;
    if (siteKey === configStore.DEFAULT_SITE_KEY) {
        return res.status(400).json({ error: 'Varsayılan site silinemez.' });
    }
    try {
        configStore.deleteSite(siteKey);
        res.json({ ok: true });
    } catch (error) {
        logger.error('Site silinemedi', { siteKey, error: error.message });
        res.status(500).json({ error: 'Site silinemedi.' });
    }
};

module.exports = { getWidgetConfig, getAdminConfig, updateConfig, listSites, deleteSite };
