/**
 * Rate limiter for X API tweet metrics endpoint
 * Tracks requests within a 15-minute rolling window
 * X API allows 25 requests per 15 minutes - we use 20 as buffer
 */

const MAX_REQUESTS = 20; // Buffer de seguridad (X permite 25)
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// In-memory tracking de timestamps de requests
const requestTimestamps: number[] = [];

/**
 * Remove old timestamps outside the current window
 */
function cleanOldTimestamps() {
  const cutoff = Date.now() - WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

/**
 * Check if we can make another request without exceeding rate limit
 */
export function canMakeRequest(): boolean {
  cleanOldTimestamps();
  return requestTimestamps.length < MAX_REQUESTS;
}

/**
 * Record a new request timestamp
 * Call this after successfully making an API request
 */
export function recordRequest(): void {
  cleanOldTimestamps();
  requestTimestamps.push(Date.now());
}

/**
 * Get number of requests remaining in current window
 */
export function getRequestsRemaining(): number {
  cleanOldTimestamps();
  return Math.max(0, MAX_REQUESTS - requestTimestamps.length);
}

/**
 * Get the time when the rate limit window will reset
 * Returns the timestamp when the oldest request will expire
 */
export function getWindowResetTime(): Date {
  cleanOldTimestamps();
  if (requestTimestamps.length === 0) {
    return new Date(); // No requests, no wait needed
  }
  const oldestTimestamp = requestTimestamps[0];
  const resetTime = oldestTimestamp + WINDOW_MS;
  return new Date(resetTime);
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus() {
  cleanOldTimestamps();
  return {
    requestsUsed: requestTimestamps.length,
    requestsRemaining: getRequestsRemaining(),
    maxRequests: MAX_REQUESTS,
    windowMs: WINDOW_MS,
    resetAt: getWindowResetTime(),
  };
}
