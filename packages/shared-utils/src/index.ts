export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function generateIdempotencyKey(prefix: string = 'req'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < length; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isLocationStale(capturedAt: Date, thresholdMinutes: number = 5): boolean {
  const now = new Date();
  const diffMinutes = (now.getTime() - capturedAt.getTime()) / (1000 * 60);
  return diffMinutes > thresholdMinutes;
}

export function getLocationStatus(
  capturedAt: Date,
  receivedAt: Date,
  thresholdMinutes: number = 5
): 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE' {
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

export function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; baseDelayMs: number; maxDelayMs: number } = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  }
): Promise<T> {
  let lastError: Error;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === options.maxAttempts) break;
      const delay = Math.min(options.baseDelayMs * Math.pow(2, attempt - 1), options.maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError!;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
