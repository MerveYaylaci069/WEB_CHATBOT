const chatService = require('../services/chatService');
const configStore = require('../services/configStore');
const rateLimiter = require('../services/rateLimiter');
const conversationStore = require('../services/conversationStore');
const logger = require('../utils/logger');

// attachment.fileType için config.allowedFileTypes anahtarları: image | pdf | docx
const validateAttachment = (attachment, widgetConfig) => {
    if (!attachment) return null;
    if (!widgetConfig.allowImageUpload) {
        return "Bu widget'ta dosya/resim gönderimi kapalı.";
    }
    const typeKey = attachment.isImage ? 'image' : attachment.fileType;
    if (!typeKey || widgetConfig.allowedFileTypes?.[typeKey] === false || widgetConfig.allowedFileTypes?.[typeKey] === undefined) {
        return 'Bu dosya türü için izin verilmiyor.';
    }
    return null;
};

const rateLimitMessage = (isEN) => isEN
    ? 'You are sending messages too quickly. Please wait a moment and try again.'
    : 'Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.';

const handleChat = async (req, res) => {
    const start = Date.now();
    const resolvedSiteKey = req.body.siteKey || configStore.DEFAULT_SITE_KEY;
    try {
        const { message, lang, siteKey, attachment, visitorId, history, ragSessionId } = req.body;
        const isEN = lang === 'EN';

        if (!message) {
            return res.status(400).json({ error: "Mesaj alanı boş olamaz!" });
        }

        const widgetConfig = configStore.getConfig(resolvedSiteKey);

        if (attachment) {
            const attachmentError = validateAttachment(attachment, widgetConfig);
            if (attachmentError) {
                return res.status(400).json({ error: attachmentError });
            }
        }

        // Kullanıcı başına (site + IP) dakikalık istek/token sınırı — admin panelden açılıp kapatılır.
        const rateLimitKey = `${resolvedSiteKey}:${req.ip}`;
        if (widgetConfig.rateLimit?.enabled) {
            if (!rateLimiter.checkTpm(rateLimitKey, widgetConfig.rateLimit.tpm)) {
                return res.status(429).json({ error: rateLimitMessage(isEN) });
            }
            if (!rateLimiter.checkAndRecordRpm(rateLimitKey, widgetConfig.rateLimit.rpm)) {
                return res.status(429).json({ error: rateLimitMessage(isEN) });
            }
        }

        const { reply, usage, ragSessionId: newRagSessionId, ragTitle } = await chatService.generateReply(message, lang || 'TR', siteKey, null, attachment || null, history, ragSessionId);

        if (widgetConfig.rateLimit?.enabled && usage?.total_tokens) {
            rateLimiter.recordTokens(rateLimitKey, usage.total_tokens);
        }

        // visitorId, widget'ın tarayıcıda ürettiği anonim bir kimlik — girişli bir hesap değil.
        // Yoksa (ör. eski/gömülü bir widget sürümü) sessizce kaydetmiyoruz, hataya düşmüyoruz.
        if (typeof visitorId === 'string' && visitorId.length <= 100) {
            conversationStore.addTurn({ siteKey: resolvedSiteKey, visitorId, lang: lang || 'TR', userMessage: message, botReply: reply });
        }

        // İstatistikler sayfasının site bazlı özet çıkarabilmesi için, genel istek logundan
        // ayrı olarak siteKey içeren bu satırı yazıyoruz (bkz. backend/services/statsService.js).
        logger.info('Chat isteği tamamlandı', { siteKey: resolvedSiteKey, lang: lang || 'TR', ms: Date.now() - start });

        res.json({ reply, ragSessionId: newRagSessionId || null, ragTitle: ragTitle || null });

    } catch (error) {
        logger.error('Chat isteği başarısız', { siteKey: resolvedSiteKey, message: error.message });
        res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
    }
};

// Sadece admin panelinin "canlı test" alanı için: henüz kaydedilmemiş taslak ayarlarla
// (system prompt dahil) deneme yapılmasını sağlar. Hiçbir yerde saklanmaz, sadece bu tek
// istek için kullanılır. Bu uç, herkese açık olan handleChat'ten ayrı tutuluyor ve
// hız sınırlamasına tabi değildir (admin kendi taslağını test ediyor).
const handlePreviewChat = async (req, res) => {
    try {
        const { message, lang, config, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Mesaj alanı boş olamaz!" });
        }
        if (!config || typeof config !== 'object') {
            return res.status(400).json({ error: "Önizleme için config zorunludur." });
        }

        const { reply } = await chatService.generateReply(message, lang || 'TR', undefined, config, null, history);

        res.json({ reply });

    } catch (error) {
        logger.error('Önizleme isteği başarısız', { message: error.message });
        res.status(500).json({ error: "Sunucu tarafında bir hata oluştu." });
    }
};

module.exports = { handleChat, handlePreviewChat };
