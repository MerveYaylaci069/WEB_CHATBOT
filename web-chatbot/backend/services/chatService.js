require('dotenv').config();
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');
const configStore = require('./configStore');
const llmSettingsStore = require('./llmSettingsStore');
const logger = require('../utils/logger');

// Modele gönderilen geçmiş, hem token maliyetini hem de bağlamın büyümesini sınırlamak için
// son birkaç turla sınırlandırılıyor.
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS_PER_MESSAGE = 4000;
const MAX_EXTRACTED_FILE_CHARS = 6000;

// Client'tan gelen geçmiş asla ham güvenilmez — sadece user/assistant rolleri kabul edilir,
// 'system' rolü asla client'tan alınmaz (aksi halde system prompt client tarafından ezilebilirdi).
function sanitizeHistory(rawHistory) {
    if (!Array.isArray(rawHistory)) return [];
    return rawHistory
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_CHARS_PER_MESSAGE) }));
}

// PDF/DOCX dosyalarının gerçek içeriğini okuyup modele gönderir — önceden sadece dosya adı
// gidiyordu. Çıkarma başarısız olursa (bozuk dosya, desteklenmeyen format vb.) sessizce null
// döner ve buildUserContent yalnızca dosya adı notuna düşer.
async function extractAttachmentText(attachment) {
    if (!attachment || attachment.isImage || !attachment.dataUrl) return null;
    try {
        const base64 = attachment.dataUrl.split(',')[1];
        if (!base64) return null;
        const buffer = Buffer.from(base64, 'base64');

        if (attachment.fileType === 'docx') {
            const result = await mammoth.extractRawText({ buffer });
            const text = (result.value || '').trim();
            return text ? text.slice(0, MAX_EXTRACTED_FILE_CHARS) : null;
        }
        if (attachment.fileType === 'pdf') {
            const parser = new PDFParse({ data: buffer });
            try {
                const result = await parser.getText();
                const text = (result.text || '').trim();
                return text ? text.slice(0, MAX_EXTRACTED_FILE_CHARS) : null;
            } finally {
                await parser.destroy();
            }
        }
        return null;
    } catch (error) {
        logger.error('Dosya içeriği çıkarılamadı', { fileName: attachment.fileName, message: error.message });
        return null;
    }
}

// Küçük/yerel modeller uzun cevaplarda bazen Çince/Japonca/Korece karakterlere kayabiliyor
// (eğitim verisi ağırlığından kaynaklanan bir model davranışı). Bu, resmi bir kurum botunda
// asla gösterilmemeli — ilk yabancı alfabe karakterinde cevabı kesiyoruz, çünkü o noktadan
// sonraki metin de genelde tutarsız/bozuk oluyor.
const FOREIGN_SCRIPT_PATTERN = /[一-鿿぀-ヿ가-힯]/;

function stripForeignScriptDrift(text) {
    const match = text.match(FOREIGN_SCRIPT_PATTERN);
    if (!match) return text;
    return text.slice(0, match.index).trim();
}

// Arkadaşın sistemi gerçek bir arama + dış LLM (OpenAI/Gemini) zinciri çalıştırıyor — bu,
// özellikle ilk/soğuk istekte 10 saniyeden uzun sürebiliyor. Süre kısa tutulursa her zaman
// zaman aşımına uğrayıp gereksiz yere yedek LLM'e düşülür.
const RAG_API_TIMEOUT_MS = 30000;

// Konya verilerini önceden taramış, kendi başına cevap üreten ayrı bir proje (dış RAG API'si).
// Açıksa cevap önce burdan denenir; API kapalıysa, ağ hatası verirse ya da zaman aşımına
// uğrarsa sessizce normal LLM akışına düşülür (widget hiçbir zaman kırık kalmaz).
async function callExternalRagApi(ragApiEndpoint, userMessage, ragSessionId) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RAG_API_TIMEOUT_MS);
    try {
        const url = `${ragApiEndpoint.replace(/\/$/, '')}/ask`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soru: userMessage, session_id: ragSessionId || null }),
            signal: controller.signal
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || typeof data.cevap !== 'string' || !data.cevap.trim()) return null;
        return {
            reply: data.cevap.trim(),
            sources: Array.isArray(data.kaynaklar) ? data.kaynaklar : [],
            ragSessionId: data.session_id || null,
            ragTitle: data.title || null
        };
    } catch (error) {
        logger.error('Dış RAG API çağrısı başarısız, LLM akışına düşülüyor', { message: error.message });
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// Kaynak listesini kullanıcıya okunabilir, kısa bir liste olarak biçimlendirir.
function formatSources(sources, isEN) {
    if (!sources || sources.length === 0) return '';
    const label = isEN ? 'Sources' : 'Kaynaklar';
    const lines = sources.slice(0, 5).map((s) => {
        const title = s.baslik || s.title || s.kaynak || (isEN ? 'Source' : 'Kaynak');
        return s.url ? `- [${title}](${s.url})` : `- ${title}`;
    });
    return `\n\n**${label}:**\n${lines.join('\n')}`;
}

// Görsel ekliyse OpenAI'nin çok parçalı (vision) mesaj formatını üretir — şu an yüklü model
// (metin-only) bunu görmezden gelir, ama ileride görsel destekleyen bir model yüklendiğinde
// kod hiç değişmeden çalışmaya başlar. Görsel olmayan dosyalarda (PDF/DOCX) gerçek içerik
// çıkarılıp metne eklenir (bkz. extractAttachmentText); çıkarılamazsa sadece dosya adı kalır.
async function buildUserContent(userMessage, attachment, isEN) {
    if (!attachment) return userMessage;

    if (attachment.isImage && attachment.dataUrl) {
        return [
            { type: 'text', text: userMessage || (isEN ? 'Please look at this image.' : 'Lütfen bu görsele bak.') },
            { type: 'image_url', image_url: { url: attachment.dataUrl } }
        ];
    }

    const note = isEN ? `[Attached file: ${attachment.fileName}]` : `[Ekli dosya: ${attachment.fileName}]`;
    const extractedText = await extractAttachmentText(attachment);
    if (extractedText) {
        const label = isEN ? 'File content' : 'Dosya içeriği';
        return `${userMessage}\n\n${note}\n\n--- ${label} ---\n${extractedText}`;
    }
    return `${userMessage}\n\n${note}`;
}

class ChatService {
    // overrideConfig: SADECE admin panelinin "canlı test" önizlemesi için kullanılır
    // (backend/controllers/chatController.js -> handlePreviewChat). Normal/public sohbet
    // (handleChat) bunu asla client'tan almaz — aksi halde system prompt'u client'ın
    // ezebileceği eski güvenlik açığı geri gelirdi.
    // attachment: { dataUrl, isImage, fileName } | null — bkz. buildUserContent.
    // history: [{role:'user'|'assistant', content:string}] — bu turdan ÖNCEKİ mesajlar (client'tan
    // gelir, sanitizeHistory ile temizlenir). Modelin önceki mesajları "hatırlamasını" sağlar.
    // ragSessionId: dış RAG API'sinin kendi oturum kimliği (client'ta saklanır, bkz. chatController).
    async generateReply(userMessage, lang = 'TR', siteKey = configStore.DEFAULT_SITE_KEY, overrideConfig = null, attachment = null, history = [], ragSessionId = null) {
        // .env sadece ilk kurulum/varsayılan değeri sağlar — admin panelden kaydedilmiş bir
        // ayar varsa (backend/data/llm-settings.json) o önceliklidir.
        const { endpoint, apiKey, modelName, ragApiEnabled, ragApiEndpoint } = llmSettingsStore.getSettings();

        const isEN = lang === 'EN';

        // Sistem prompt'u ve diğer davranış ayarlarını client'tan DEĞİL, backend'in sahip
        // olduğu config store'dan alıyoruz. Böylece prompt hiçbir zaman tarayıcıya/ağ isteğine sızmaz.
        const widgetConfig = overrideConfig || configStore.getConfig(siteKey);

        if (widgetConfig.maintenanceMode) {
            const reply = widgetConfig.maintenanceMessage || (isEN
                ? 'Huna AI is currently under maintenance. Please try again later.'
                : 'Huna AI şu anda bakımda. Lütfen daha sonra tekrar deneyin.');
            return { reply, usage: null };
        }

        // Dış RAG API'si açıksa (ve bu dosya eki içermeyen düz bir metin sorusuysa), cevap önce
        // orada denenir — o proje kendi başına tam bir cevap üretiyor. Kapalıysa, hata verirse
        // veya zaman aşımına uğrarsa aşağıdaki normal LLM akışına sessizce düşülür.
        if (ragApiEnabled && ragApiEndpoint && !attachment) {
            const ragResult = await callExternalRagApi(ragApiEndpoint, userMessage, ragSessionId);
            if (ragResult) {
                return {
                    reply: ragResult.reply + formatSources(ragResult.sources, isEN),
                    usage: null,
                    ragSessionId: ragResult.ragSessionId,
                    ragTitle: ragResult.ragTitle
                };
            }
        }

        // Dinamik Tarih ve Saat
        const now = new Date();
        const bugun = now.toLocaleDateString(isEN ? 'en-US' : 'tr-TR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        const currentTime = now.toLocaleTimeString(isEN ? 'en-US' : 'tr-TR', {
            hour: '2-digit', minute: '2-digit'
        });

        const baseRole = widgetConfig.systemPrompt;

        // Dil talimatı hem başta hem sonda tekrar edilir; aksi halde tamamen Türkçe olan
        // baseRole + format kuralları bloğu, İngilizce moduna eklenen tek cümleyi bastırıp
        // modelin (özellikle küçük/yerel modellerde) Türkçe cevap vermesine yol açıyordu.
        const languageDirective = isEN
            ? 'LANGUAGE RULE (MOST IMPORTANT — FOLLOW STRICTLY): Respond ONLY in English, in every message, from the first word to the last, regardless of the language of the instructions below or the user\'s message. NEVER switch to Chinese, Japanese, Korean, or any other language mid-response, even in a long answer.'
            : 'DİL KURALI (EN ÖNEMLİ KURAL — KESİNLİKLE UY): Kullanıcı hangi dilde yazarsa yazsın, cevabın ilk kelimesinden son kelimesine kadar SADECE Türkçe yaz. Cevap ne kadar uzun olursa olsun, hiçbir zaman Çince, Japonca, Korece veya başka bir dile geçme.';

        const lengthRuleEN = { short: 'Keep answers very short: 1-3 sentences max.', medium: 'Keep answers concise but complete.', detailed: 'Give thorough, detailed explanations.' }[widgetConfig.responseLength] || '';
        const lengthRuleTR = { short: 'Cevapları çok kısa tut: en fazla 1-3 cümle.', medium: 'Cevapları öz ama eksiksiz tut.', detailed: 'Detaylı ve kapsamlı açıklamalar yap.' }[widgetConfig.responseLength] || '';

        const politicalRuleEN = 'You must NOT discuss or take a position on political parties, politicians, elections, or partisan political topics. If asked, politely decline and redirect to the municipality\'s official, non-political services.';
        const politicalRuleTR = 'Siyasi partiler, siyasetçiler, seçimler veya taraflı siyasi konular hakkında KESİNLİKLE görüş belirtme ve tartışmaya girme. Bu yönde bir soru gelirse kibarca reddedip belediyenin siyaset dışı resmi hizmetlerine yönlendir.';

        const profanityRuleEN = 'Even if the user is rude, insulting, or uses slang/profanity, you must NEVER respond with insults, slang, or profanity yourself. Always remain polite and professional, and calmly redirect the conversation back to official municipal topics.';
        const profanityRuleTR = 'Kullanıcı sana hakaret etse, argo veya küfürlü konuşsa bile SEN asla hakaret, argo veya küfürlü bir dil kullanma. Her zaman kibar ve profesyonel bir üslup koru, konuşmayı sakince belediye hizmetleri konusuna yönlendir.';

        const extraRulesEN = [lengthRuleEN];
        if (widgetConfig.blockPoliticalTopics) extraRulesEN.push(politicalRuleEN);
        if (widgetConfig.blockProfanity) extraRulesEN.push(profanityRuleEN);

        const extraRulesTR = [lengthRuleTR];
        if (widgetConfig.blockPoliticalTopics) extraRulesTR.push(politicalRuleTR);
        if (widgetConfig.blockProfanity) extraRulesTR.push(profanityRuleTR);

        const formatRules = isEN
            ? `ADDITIONAL FORMAT RULES:
1. TODAY'S DATE AND TIME: ${bugun}, ${currentTime}. (Use this if the user asks.)
2. Use English number formatting (e.g. 3,333.33 for decimals, 10,000 for thousands).
3. Use Markdown to improve readability (headings, lists, **bold** for emphasis).
${extraRulesEN.map((rule, i) => `${i + 4}. ${rule}`).join('\n')}`
            : `EKSTRA BİLGİLER VE FORMAT KURALLARI:
1. BUGÜNÜN TARİHİ VE SAATİ: ${bugun}, Saat: ${currentTime}. (Kullanıcı sorarsa bu bilgiyi kullan).
2. Türkçe harf kurallarına KESİNLİKLE uy:
   - Büyük "I" harfinin küçük hali "ı"dır. (Örn: ILGAZ -> ılgaz).
   - Büyük "İ" harfinin küçük hali "i"dir. (Örn: İSTANBUL -> istanbul).
3. Sayısal verileri yazarken Türkiye matematik standartlarını kullan:
   - Ondalık kısımları (küsuratları) ayırmak için VİRGÜL kullan (Örn: 3333,33).
   - Binlik ayırıcı olarak nokta kullan (Örn: 10.000).
4. ÖNEMLİ: Cevaplarını yapılandırırken okunabilirliği artırmak için Markdown kullan (Örn: Başlıklar, listeler ve vurgulamak istediğin yerler için **kalın yazı**).
${extraRulesTR.map((rule, i) => `${i + 5}. ${rule}`).join('\n')}`;

        // Tüm kuralları tek bir Sistem Prompt'unda (System Role) topluyoruz
        const enforcedSystemMessage = `${languageDirective}

${baseRole}

${formatRules}

${languageDirective}`;

        try {
            const sanitizedHistory = sanitizeHistory(history);
            const userContent = await buildUserContent(userMessage, attachment, isEN);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: enforcedSystemMessage }, // Kurallar sadece burada
                        ...sanitizedHistory,
                        { role: 'user', content: userContent }
                    ],
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                // Önceden burada sadece genel bir hata fırlatılıp LLM'in asıl döndürdüğü kod/mesaj
                // atılıyordu — bu da "neden başarısız oldu" sorusunu loglardan cevaplanamaz hale
                // getiriyordu (ör. görsel/vision istekleri reddedilince). Artık asıl yanıt loglanıyor.
                const errorBody = await response.text().catch(() => '');
                logger.error('LLM sunucusu hata döndürdü', {
                    siteKey,
                    status: response.status,
                    statusText: response.statusText,
                    body: errorBody.slice(0, 1000)
                });
                throw new Error(`LLM sunucusu ile iletişim kurulamadı (HTTP ${response.status}).`);
            }

            const data = await response.json();
            const rawReply = data.choices[0].message.content || '';
            const cleanedReply = stripForeignScriptDrift(rawReply).trim();
            const usage = data.usage || null;

            if (rawReply && !cleanedReply) {
                logger.error('Cevap tamamen yabancı alfabeye kaydı, tamamı temizlendi', { siteKey, lang });
                const reply = isEN
                    ? "Sorry, I couldn't generate a proper answer. Please try again."
                    : 'Üzgünüm, düzgün bir cevap oluşturamadım. Lütfen tekrar deneyin.';
                return { reply, usage };
            }
            if (cleanedReply !== rawReply.trim()) {
                logger.info('Yabancı alfabe kayması tespit edildi, cevap kesildi', { siteKey, lang });
            }

            return { reply: cleanedReply || 'Cevap alınamadı.', usage };

        } catch (error) {
            logger.error('Yapay Zeka Servis Hatası', { message: error.message, endpoint, siteKey });
            const reply = lang === 'EN'
                ? "I'm sorry, my servers are busy right now. Please try again later."
                : "Üzgünüm, şu an sunucularımda bir yoğunluk var. Lütfen daha sonra tekrar deneyin.";
            return { reply, usage: null };
        }
    }
}

module.exports = new ChatService();