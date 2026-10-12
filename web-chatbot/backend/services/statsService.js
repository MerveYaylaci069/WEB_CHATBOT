const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'app.log');

function readLogLines() {
    try {
        const raw = fs.readFileSync(LOG_FILE, 'utf-8');
        return raw
            .split('\n')
            .filter(Boolean)
            .map((line) => {
                try {
                    return JSON.parse(line);
                } catch (err) {
                    return null;
                }
            })
            .filter(Boolean);
    } catch (err) {
        return [];
    }
}

function computeStatsForSite(chatLines, errorLines, driftLines) {
    let totalMs = 0;
    let msCount = 0;
    const byDay = {};

    chatLines.forEach((l) => {
        if (l.meta && typeof l.meta.ms === 'number') {
            totalMs += l.meta.ms;
            msCount++;
        }
        const day = (l.timestamp || '').slice(0, 10);
        if (day) byDay[day] = (byDay[day] || 0) + 1;
    });

    const last7Days = Object.entries(byDay)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 7)
        .reverse()
        .map(([date, count]) => ({ date, count }));

    return {
        totalRequests: chatLines.length,
        avgResponseMs: msCount ? Math.round(totalMs / msCount) : null,
        llmErrors: errorLines.length,
        scriptDriftCount: driftLines.length,
        last7Days
    };
}

// Her site için ayrı ayrı özet döner — "hangi istatistik hangi siteye ait" admin panelinde
// net görünsün diye, tek bir global toplam yerine site bazlı bir liste kullanıyoruz.
function getStatsBySite() {
    const lines = readLogLines();

    const chatLines = lines.filter((l) => l.message === 'Chat isteği tamamlandı');
    const errorLines = lines.filter((l) => l.level === 'error' && l.message === 'Yapay Zeka Servis Hatası');
    const driftLines = lines.filter((l) => l.message === 'Yabancı alfabe kayması tespit edildi');

    const siteKeys = Array.from(new Set([
        ...chatLines.map((l) => l.meta?.siteKey).filter(Boolean),
        ...errorLines.map((l) => l.meta?.siteKey).filter(Boolean),
        ...driftLines.map((l) => l.meta?.siteKey).filter(Boolean)
    ]));

    return siteKeys.map((siteKey) => ({
        siteKey,
        ...computeStatsForSite(
            chatLines.filter((l) => l.meta?.siteKey === siteKey),
            errorLines.filter((l) => l.meta?.siteKey === siteKey),
            driftLines.filter((l) => l.meta?.siteKey === siteKey)
        )
    }));
}

module.exports = { getStatsBySite };
