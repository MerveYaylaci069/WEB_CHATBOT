require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const chatRoutes = require('./routes/chatRoutes');
const configRoutes = require('./routes/configRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const statsRoutes = require('./routes/statsRoutes');
const translateRoutes = require('./routes/translateRoutes');
const llmSettingsRoutes = require('./routes/llmSettingsRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = 3001;

app.use(cors());
// Varsayılan limit (100kb) base64 kodlu dosya eklerine yetmiyor, bu yüzden artırıldı.
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, { ms: Date.now() - start });
    });
    next();
});

app.use('/api/chat', chatRoutes);
app.use('/api/config', configRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/llm-settings', llmSettingsRoutes);

app.listen(PORT, () => {
    logger.info(`KBB Huna AI Sunucusu Aktif — http://localhost:${PORT}`);
});