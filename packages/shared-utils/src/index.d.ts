export declare function formatDate(date: Date): string;
export declare function parseDate(dateString: string): Date;
export declare function generateIdempotencyKey(prefix?: string): string;
export declare function generateSecureToken(length?: number): string;
export declare function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number;
export declare function isLocationStale(capturedAt: Date, thresholdMinutes?: number): boolean;
export declare function getLocationStatus(
  capturedAt: Date,
  receivedAt: Date,
  thresholdMinutes?: number
): 'LIVE' | 'PREDICTED' | 'LAST_KNOWN' | 'STALE';
export declare function sleep(ms: number): Promise<void>;
export declare function retry<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  }
): Promise<T>;
export declare function chunkArray<T>(array: T[], size: number): T[][];
export declare function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>;
export declare function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
