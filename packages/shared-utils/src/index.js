"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.parseDate = parseDate;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.generateSecureToken = generateSecureToken;
exports.calculateDistance = calculateDistance;
exports.isLocationStale = isLocationStale;
exports.getLocationStatus = getLocationStatus;
exports.sleep = sleep;
exports.retry = retry;
exports.chunkArray = chunkArray;
exports.pick = pick;
exports.omit = omit;
function formatDate(date) {
    return date.toISOString();
}
function parseDate(dateString) {
    return new Date(dateString);
}
function generateIdempotencyKey(prefix = 'req') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
function generateSecureToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomValues = new Uint8Array(length);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomValues);
    }
    else {
        for (let i = 0; i < length; i++) {
            randomValues[i] = Math.floor(Math.random() * 256);
        }
    }
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
function isLocationStale(capturedAt, thresholdMinutes = 5) {
    const now = new Date();
    const diffMinutes = (now.getTime() - capturedAt.getTime()) / (1000 * 60);
    return diffMinutes > thresholdMinutes;
}
function getLocationStatus(capturedAt, receivedAt, thresholdMinutes = 5) {
    const now = new Date();
    const captureDiff = (now.getTime() - capturedAt.getTime()) / (1000 * 60);
    const receiveDiff = (now.getTime() - receivedAt.getTime()) / (1000 * 60);
    if (captureDiff <= 1 && receiveDiff <= 1) {
        return 'LIVE';
    }
    if (captureDiff <= thresholdMinutes && receiveDiff <= thresholdMinutes) {
        return 'LAST_KNOWN';
    }
    if (captureDiff <= thresholdMinutes * 3) {
        return 'PREDICTED';
    }
    return 'STALE';
}
function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}
async function retry(fn, options = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
}) {
    let lastError;
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === options.maxAttempts)
                break;
            const delay = Math.min(options.baseDelayMs * Math.pow(2, attempt - 1), options.maxDelayMs);
            await sleep(delay);
        }
    }
    throw lastError;
}
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
function pick(obj, keys) {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}
function omit(obj, keys) {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
//# sourceMappingURL=index.js.map