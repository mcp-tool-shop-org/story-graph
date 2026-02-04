import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getRateLimitBucketCount, parseJsonWithLimit, rateLimit, requireAuth, resetRateLimits, sweepRateLimitsForTest } from './api-guards';
import { getTokenHashPrefix } from './logger';

function makeRequest(body: string, headers?: Record<string, string>): Request {
  return new Request('https://example.com/api/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
}

describe('api-guards', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  it('rejects payloads that exceed size limit', async () => {
    const bigBody = 'x'.repeat(300 * 1024);
    const result = await parseJsonWithLimit(makeRequest(bigBody));
    expect(result instanceof Response && result.status).toBe(413);
  });

  it('requires auth when token is configured', () => {
    process.env.STORYGRAPH_API_TOKEN = 'secret';
    const res = requireAuth(makeRequest('{}'));
    expect(res?.status).toBe(401);
    const ok = requireAuth(makeRequest('{}', { authorization: 'Bearer secret' }));
    expect(ok).toBeNull();
    delete process.env.STORYGRAPH_API_TOKEN;
  });

  it('limits repeated calls from same client', () => {
    const req = makeRequest('{}', { 'x-forwarded-for': '1.2.3.4' });
    let last: Response | null = null;
    for (let i = 0; i < 25; i++) {
      last = rateLimit(req) as Response | null;
    }
    expect(last?.status).toBe(429);
  });

  it('emits structured log on rate-limit denial with retry-after header', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined as unknown as void);
    const token = 'Bearer noisy-token';
    const req = makeRequest('{}', { 'x-forwarded-for': '9.9.9.9', authorization: token });
    // Exhaust quickly by setting small bucket
    const first = rateLimit(req, { maxTokens: 1, windowMs: 1000 });
    expect(first).toBeNull();
    const denied = rateLimit(req, { maxTokens: 1, windowMs: 1000 });
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get('retry-after')).toBeDefined();
    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(logSpy.mock.calls.at(-1)?.[0] ?? '{}');
    expect(payload.event).toBe('rate_limit_denied');
    expect(payload.status).toBe(429);
    expect(payload.route).toBe('/api/test');
    expect(payload.limitKey).toContain(getTokenHashPrefix(token) ?? 'anon');
    expect(payload.retryAfterMs).toBeGreaterThan(0);
  });

  it('prunes expired buckets during sweep', () => {
    vi.useFakeTimers({ now: 0 });
    const req = makeRequest('{}', { 'x-forwarded-for': '1.1.1.1' });
    rateLimit(req, { maxTokens: 1, windowMs: 1000 });
    expect(getRateLimitBucketCount()).toBe(1);
    vi.advanceTimersByTime(3000);
    sweepRateLimitsForTest();
    expect(getRateLimitBucketCount()).toBe(0);
    vi.useRealTimers();
  });

  it('logs a cap event and prunes oldest when bucket cap is reached', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined as unknown as void);
    const baseHeaders = { authorization: 'Bearer test' };
    rateLimit(makeRequest('{}', { ...baseHeaders, 'x-forwarded-for': '2.2.2.2' }), { maxTokens: 1, windowMs: 1000, maxBuckets: 2 });
    rateLimit(makeRequest('{}', { ...baseHeaders, 'x-forwarded-for': '3.3.3.3' }), { maxTokens: 1, windowMs: 1000, maxBuckets: 2 });
    const res = rateLimit(makeRequest('{}', { ...baseHeaders, 'x-forwarded-for': '4.4.4.4' }), { maxTokens: 1, windowMs: 1000, maxBuckets: 2 });
    expect(res).toBeNull();
    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(logSpy.mock.calls.at(-1)?.[0] ?? '{}');
    expect(payload.event).toBe('rate_limiter_capped');
    expect(payload.maxBuckets).toBe(2);
    expect(payload.bucketCount).toBeLessThanOrEqual(2);
    expect(getRateLimitBucketCount()).toBe(2);
  });
});
