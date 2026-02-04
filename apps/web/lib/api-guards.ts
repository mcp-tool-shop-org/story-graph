import { Buffer } from 'node:buffer';
import { errorResponse } from './http';
import { getHashPrefix, getTokenHashPrefix, logRateLimitDenied, logRateLimiterCapped } from './logger';

const MAX_BYTES = 256 * 1024;
const DEFAULT_WINDOW_MS = Number(process.env.STORYGRAPH_RATE_LIMIT_WINDOW_MS ?? 10_000);
const DEFAULT_TOKENS = Number(process.env.STORYGRAPH_RATE_LIMIT_TOKENS ?? 20);
const DEFAULT_MAX_BUCKETS = Number(process.env.STORYGRAPH_RATE_LIMIT_MAX_BUCKETS ?? 50_000);
const MAX_BUCKET_TTL_MS = Number(process.env.STORYGRAPH_RATE_LIMIT_MAX_BUCKET_TTL_MS ?? 30 * 60 * 1000);
const SWEEP_INTERVAL = Number(process.env.STORYGRAPH_RATE_LIMIT_SWEEP_INTERVAL ?? 500);
const RATE_LIMIT_DISABLED = process.env.STORYGRAPH_RATE_LIMIT_DISABLED === 'true' || process.env.NODE_ENV === 'development';

type Bucket = {
  tokens: number;
  updatedAt: number;
  lastSeen: number;
  windowMs: number;
  maxTokens: number;
};

const buckets = new Map<string, Bucket>();
let requestCount = 0;

// Observability: track metrics for diagnostics
let sweepCount = 0;
let totalPrunedCount = 0;
let totalDeniedCount = 0;
let lastMetricLogMs = Date.now();
const METRIC_LOG_INTERVAL_MS = Number(process.env.STORYGRAPH_RATE_LIMIT_METRIC_LOG_INTERVAL_MS ?? 60_000);
const METRIC_LOG_SWEEPS = Number(process.env.STORYGRAPH_RATE_LIMIT_METRIC_LOG_SWEEPS ?? 50);

function logMetricsIfDue(now: number): void {
  if (now - lastMetricLogMs < METRIC_LOG_INTERVAL_MS && sweepCount % METRIC_LOG_SWEEPS !== 0) return;
  console.log(
    JSON.stringify({
      event: 'rate_limiter_metrics',
      sweepCount,
      totalPrunedCount,
      totalDeniedCount,
      activeBuckets: buckets.size,
      timestamp: new Date().toISOString(),
    })
  );
  lastMetricLogMs = now;
}

function sweepExpiredBuckets(now: number, maxBucketTtlMs: number): void {
  let prunedInSweep = 0;
  for (const [key, bucket] of buckets.entries()) {
    const ttl = Math.min(bucket.windowMs * 2, maxBucketTtlMs);
    if (now - bucket.lastSeen > ttl) {
      buckets.delete(key);
      prunedInSweep++;
    }
  }
  if (prunedInSweep > 0) {
    totalPrunedCount += prunedInSweep;
  }
  sweepCount++;
  logMetricsIfDue(now);
}

function pruneOldestBuckets(targetSize: number): number {
  if (buckets.size <= targetSize) return 0;
  const ordered = Array.from(buckets.entries()).sort((a, b) => a[1].lastSeen - b[1].lastSeen);
  let removed = 0;
  for (const [key] of ordered) {
    if (buckets.size <= targetSize) break;
    buckets.delete(key);
    removed += 1;
  }
  return removed;
}

export async function parseJsonWithLimit(request: Request, requestId?: string): Promise<any | Response> {
  const raw = await request.text();
  const size = Buffer.byteLength(raw, 'utf8');
  if (size > MAX_BYTES) {
    return errorResponse('payload_too_large', 'Payload too large', 413, undefined, requestId);
  }
  try {
    return JSON.parse(raw || '{}');
  } catch (_err) {
    return errorResponse('invalid_json', 'Invalid JSON', 400, undefined, requestId);
  }
}

export function requireAuth(request: Request, requestId?: string): Response | null {
  if (process.env.STORYGRAPH_AUTH_OPTIONAL === 'true') return null;
  const token = process.env.STORYGRAPH_API_TOKEN;
  if (!token) return null;
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ') || header.slice('Bearer '.length) !== token) {
    return errorResponse('unauthorized', 'Unauthorized', 401, undefined, requestId);
  }
  return null;
}

function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function rateLimit(
  request: Request,
  opts?: { maxTokens?: number; windowMs?: number; token?: string; requestId?: string; maxBuckets?: number }
): Response | null {
  if (RATE_LIMIT_DISABLED) return null;
  const path = new URL(request.url).pathname;
  const token = opts?.token ?? request.headers.get('authorization') ?? 'anon';
  const tokenHashPrefix = getTokenHashPrefix(token);
  const clientKey = getClientKey(request);
  const clientHash = getHashPrefix(clientKey);
  const key = `${token}:${path}:${clientKey}`;
  const now = Date.now();
  requestCount += 1;

  if (requestCount % SWEEP_INTERVAL === 0) {
    sweepExpiredBuckets(now, MAX_BUCKET_TTL_MS);
  }

  const maxBuckets = opts?.maxBuckets ?? DEFAULT_MAX_BUCKETS;
  const existing = buckets.get(key);

  if (!existing && buckets.size >= maxBuckets) {
    pruneOldestBuckets(maxBuckets - 1);
    logRateLimiterCapped({
      requestId: opts?.requestId,
      route: path,
      method: request.method,
      bucketCount: buckets.size,
      maxBuckets,
    });
    if (buckets.size >= maxBuckets) {
      const response = errorResponse('rate_limiter_saturated', 'Rate limiter at capacity', 503, undefined, opts?.requestId, {
        'retry-after': '1',
      });
      return response;
    }
  }

  const bucket: Bucket = existing ?? {
    tokens: opts?.maxTokens ?? DEFAULT_TOKENS,
    updatedAt: now,
    lastSeen: now,
    windowMs: opts?.windowMs ?? DEFAULT_WINDOW_MS,
    maxTokens: opts?.maxTokens ?? DEFAULT_TOKENS,
  };

  const elapsed = now - bucket.updatedAt;
  const refill = Math.floor(elapsed / bucket.windowMs) * bucket.maxTokens;
  const tokens = Math.min(bucket.maxTokens, bucket.tokens + refill);
  bucket.lastSeen = now;
  if (tokens <= 0) {
    totalDeniedCount++;
    const retryAfterMs = bucket.windowMs - (elapsed % bucket.windowMs);
    const remaining = Math.max(tokens, 0);
    const response = errorResponse('rate_limited', 'Rate limit exceeded', 429, undefined, opts?.requestId, {
      'retry-after': Math.max(1, Math.ceil(retryAfterMs / 1000)).toString(),
    });
    logRateLimitDenied({
      requestId: opts?.requestId,
      route: path,
      method: request.method,
      status: response.status,
      limitKey: `${tokenHashPrefix ?? 'anon'}:${path}`,
      windowMs: bucket.windowMs,
      max: bucket.maxTokens,
      remaining,
      remainingBefore: tokens,
      retryAfterMs,
      tokenHashPrefix,
      clientHash,
    });
    return response;
  }
  buckets.set(key, { tokens: tokens - 1, updatedAt: now, lastSeen: now, windowMs: bucket.windowMs, maxTokens: bucket.maxTokens });
  return null;
}

export function resetRateLimits(): void {
  buckets.clear();
  requestCount = 0;
}

export function sweepRateLimitsForTest(): void {
  sweepExpiredBuckets(Date.now(), MAX_BUCKET_TTL_MS);
}

export function getRateLimitBucketCount(): number {
  return buckets.size;
}
