// Basit, bellek-içi (in-memory) dakikalık pencere sayaç — kullanıcı başına (site + IP)
// RPM (dakikada istek) ve TPM (dakikada token) sınırlaması için. Sunucu yeniden başlayınca
// sıfırlanır; bu ölçekte (tek sunucu, kalıcı olması şart olmayan bir kota) yeterlidir.

const WINDOW_MS = 60 * 1000;

const requestLog = new Map(); // key -> timestamp[]
const tokenLog = new Map();   // key -> { ts, tokens }[]

function pruneRequests(arr, now) {
    while (arr.length && now - arr[0] > WINDOW_MS) arr.shift();
}

function pruneTokens(arr, now) {
    while (arr.length && now - arr[0].ts > WINDOW_MS) arr.shift();
}

// true dönerse istek kabul edilip sayaca eklenmiştir; false dönerse limit aşılmıştır (sayaca eklenmez).
function checkAndRecordRpm(key, rpm) {
    const now = Date.now();
    if (!requestLog.has(key)) requestLog.set(key, []);
    const arr = requestLog.get(key);
    pruneRequests(arr, now);
    if (arr.length >= rpm) return false;
    arr.push(now);
    return true;
}

// Son 60 saniyede zaten tüketilen token toplamı limitin altındaysa true döner.
function checkTpm(key, tpm) {
    const now = Date.now();
    if (!tokenLog.has(key)) tokenLog.set(key, []);
    const arr = tokenLog.get(key);
    pruneTokens(arr, now);
    const total = arr.reduce((sum, e) => sum + e.tokens, 0);
    return total < tpm;
}

function recordTokens(key, tokens) {
    if (!tokens || tokens <= 0) return;
    const now = Date.now();
    if (!tokenLog.has(key)) tokenLog.set(key, []);
    tokenLog.get(key).push({ ts: now, tokens });
}

module.exports = { checkAndRecordRpm, checkTpm, recordTokens };
