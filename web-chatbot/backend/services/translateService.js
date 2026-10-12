require('dotenv').config();
const llmSettingsStore = require('./llmSettingsStore');
const logger = require('../utils/logger');

// Ayrı bir çeviri API'si yok — elimizdeki aynı yerel LLM'i, "Huna" kimliği olmadan,
// sadece çeviri yapan sade bir sistem prompt'uyla kullanıyoruz.
async function translateText(text, targetLang = 'EN') {
    const { endpoint, apiKey, modelName } = llmSettingsStore.getSettings();

    const systemPrompt = targetLang === 'EN'
        ? 'You are a translator. Translate the given Turkish text to English. Output ONLY the translation, nothing else — no quotes, no explanation, no extra text.'
        : 'Sen bir çevirmensin. Verilen İngilizce metni Türkçeye çevir. SADECE çeviriyi yaz, başka hiçbir şey ekleme — tırnak işareti veya açıklama olmasın.';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
            ],
            temperature: 0.1
        })
    });

    if (!response.ok) {
        throw new Error('Çeviri servisi yanıt vermedi.');
    }

    const data = await response.json();
    return (data.choices?.[0]?.message?.content || '').trim();
}

module.exports = { translateText };
