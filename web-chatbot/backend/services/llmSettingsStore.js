const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'llm-settings.json');

function readStored() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (err) {
        return {};
    }
}

// Tüm alanlar dahil (apiKey dahil) — yalnızca sunucu içi (LLM'e istek atarken) kullanım içindir.
// Admin panelin kendisi bile bu fonksiyonu değil, getPublicSettings'i kullanır.
function getSettings() {
    const stored = readStored();
    return {
        endpoint: stored.endpoint || process.env.API_ENDPOINT || 'http://10.199.0.11/v1/chat/completions',
        apiKey: stored.apiKey || process.env.API_KEY || '',
        modelName: stored.modelName || process.env.MODEL_NAME || 'qwen2.5-coder',
        // Dış RAG API'si (Konya verilerini tarayan ayrı bir proje) — açıksa, sohbet cevabı
        // önce bu API'den denenir, başarısız olursa normal LLM akışına düşülür.
        ragApiEnabled: !!stored.ragApiEnabled,
        ragApiEndpoint: stored.ragApiEndpoint || ''
    };
}

// Admin panelinin görüntüleyip düzenleyebileceği özet — apiKey'in kendisi asla dönmez,
// sadece "bir anahtar kayıtlı mı" bilgisi (hasApiKey) döner.
function getPublicSettings() {
    const s = getSettings();
    return {
        endpoint: s.endpoint,
        modelName: s.modelName,
        hasApiKey: !!s.apiKey,
        ragApiEnabled: s.ragApiEnabled,
        ragApiEndpoint: s.ragApiEndpoint
    };
}

function saveSettings(updates = {}) {
    const current = readStored();
    const merged = { ...current };

    if (typeof updates.endpoint === 'string') merged.endpoint = updates.endpoint.trim();
    if (typeof updates.modelName === 'string') merged.modelName = updates.modelName.trim();
    // apiKey alanı boş bırakılırsa mevcut anahtar korunur — admin panel anahtarı asla
    // geri okumadığı için "boş = değiştirme" kuralı olmadan kazayla silinebilirdi.
    if (typeof updates.apiKey === 'string' && updates.apiKey.trim()) {
        merged.apiKey = updates.apiKey.trim();
    }
    if (typeof updates.ragApiEndpoint === 'string') merged.ragApiEndpoint = updates.ragApiEndpoint.trim();
    if (typeof updates.ragApiEnabled === 'boolean') merged.ragApiEnabled = updates.ragApiEnabled;

    fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
}

module.exports = { getSettings, getPublicSettings, saveSettings };
