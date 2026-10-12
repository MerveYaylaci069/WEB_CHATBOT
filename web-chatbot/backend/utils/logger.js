const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(level, message, meta) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta ? { meta } : {})
    };
    const line = JSON.stringify(entry);

    if (level === 'error') {
        console.error(line);
    } else {
        console.log(line);
    }

    fs.appendFile(LOG_FILE, line + '\n', (err) => {
        if (err) console.error('Log dosyasına yazılamadı:', err.message);
    });
}

module.exports = {
    info: (message, meta) => write('info', message, meta),
    error: (message, meta) => write('error', message, meta),
};
