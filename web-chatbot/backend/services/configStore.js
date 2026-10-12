const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'widget-config.json');
const DEFAULT_SITE_KEY = 'default';

const FALLBACK_CONFIG = {
    color: '#151d32',
    subtitle: 'Genel Asistan',
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim? 🌟',
    systemPrompt: "Sen Konya Büyükşehir Belediyesi'nin resmi dijital asistanı Huna'sın.",
    botName: 'Huna AI',
    position: 'right',
    logoEmoji: '',
    logoUrl: '',
    maintenanceMode: false,
    maintenanceMessage: 'Huna AI şu anda bakımda. Lütfen daha sonra tekrar deneyin.',
    // Her soru hem TR hem EN metniyle saklanır; widget aktif dile göre birini gösterir.
    faqList: [
        { tr: 'Erzak yardımı nasıl alırım?', en: 'How can I get food assistance?' },
        { tr: 'Sosyal kart başvurusu nasıl yapılır?', en: 'How to apply for a social card?' }
    ],
    blockPoliticalTopics: true,
    blockProfanity: true,
    responseLength: 'medium',
    allowImageUpload: false,
    allowedFileTypes: {
        image: true,
        pdf: true,
        docx: false
    },
    // Kullanıcı başına (IP + site bazlı) dakikalık istek/token sınırı.
    rateLimit: {
        enabled: false,
        rpm: 10,
        tpm: 20000
    }
};

function readAll() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        return {};
    }
}

function writeAll(allConfigs) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(allConfigs, null, 2), 'utf-8');
}

// Tüm alanlar dahil (systemPrompt dahil) — yalnızca sunucu içi kullanım içindir.
function getConfig(siteKey = DEFAULT_SITE_KEY) {
    const allConfigs = readAll();
    return { ...FALLBACK_CONFIG, ...(allConfigs[siteKey] || {}) };
}

// systemPrompt hariç, widget'ın tarayıcıya güvenle döndürebileceği alanlar.
function getPublicConfig(siteKey = DEFAULT_SITE_KEY) {
    const { systemPrompt, ...publicFields } = getConfig(siteKey);
    return publicFields;
}

function saveConfig(siteKey = DEFAULT_SITE_KEY, updates = {}) {
    const allConfigs = readAll();
    const current = { ...FALLBACK_CONFIG, ...(allConfigs[siteKey] || {}) };
    const merged = { ...current, ...updates };
    allConfigs[siteKey] = merged;
    writeAll(allConfigs);
    return merged;
}

// Admin panelinin "site seçici" listesi için hafif bir özet (tam config değil).
function listSites() {
    const allConfigs = readAll();
    return Object.keys(allConfigs).map((siteKey) => ({
        siteKey,
        botName: allConfigs[siteKey].botName || FALLBACK_CONFIG.botName,
        subtitle: allConfigs[siteKey].subtitle || FALLBACK_CONFIG.subtitle
    }));
}

function deleteSite(siteKey) {
    const allConfigs = readAll();
    delete allConfigs[siteKey];
    writeAll(allConfigs);
}

module.exports = { getConfig, getPublicConfig, saveConfig, listSites, deleteSite, DEFAULT_SITE_KEY };
