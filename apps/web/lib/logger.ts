import { createHash } from 'node:crypto';

type LogFields = Record<string, unknown>;

function slowThreshold(): number {
  return Number(process.env.STORYGRAPH_SLOW_REQUEST_THRESHOLD_MS ?? 1000);
}

function logOptionsDebug(): boolean {
  return process.env.STORYGRAPH_LOG_OPTIONS === 'true';
}

export function logRequest(event: string, fields?: LogFields): void {
  const payload = { event, ...fields, timestamp: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}

export function logWithRequest(event: string, requestId: string, fields?: LogFields): void {
  const payload = { event, requestId, ...fields, timestamp: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}

export type RequestLogFields = {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  storyId?: string | undefined;
  versionId?: string | undefined;
  tokenHashPrefix?: string | undefined;
  idempotencyHit?: boolean | undefined;
  idempotencyAgeMs?: number | undefined;
};

export function getTokenHashPrefix(token?: string | null): string | undefined {
  if (!token) return undefined;
  const bare = token.startsWith('Bearer ') ? token.slice('Bearer '.length) : token;
  return createHash('sha256').update(bare).digest('hex').slice(0, 8);
}

export function getHashPrefix(value?: string | null): string | undefined {
  if (!value) return undefined;
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

export function logRequestSummary(fields: RequestLogFields, extra?: LogFields): void {
  const slow = fields.durationMs >= slowThreshold();
  const payload = {
    event: slow ? 'request.slow' : 'request',
    slow,
    ...fields,
    ...(extra ?? {}),
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(payload));
}

export type RateLimitLogFields = {
  requestId?: string | undefined;
  route: string;
  method: string;
  status: number;
  limitKey: string;
  windowMs: number;
  max: number;
  remaining: number;
  remainingBefore?: number | undefined;
  retryAfterMs?: number | undefined;
  tokenHashPrefix?: string | undefined;
  clientHash?: string | undefined;
};

export function logRateLimitDenied(fields: RateLimitLogFields): void {
  const payload = { event: 'rate_limit_denied', ...fields, timestamp: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}

export type RateLimitCapLogFields = {
  requestId?: string | undefined;
  route: string;
  method: string;
  bucketCount: number;
  maxBuckets: number;
};

export function logRateLimiterCapped(fields: RateLimitCapLogFields): void {
  const payload = { event: 'rate_limiter_capped', ...fields, timestamp: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}

export function shouldLogOptions(status: number, durationMs: number): boolean {
  if (logOptionsDebug()) return true;
  if (status >= 300) return true;
  return durationMs >= slowThreshold();
}
