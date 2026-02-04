import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { getTokenHashPrefix, logRequestSummary, shouldLogOptions } from './logger';

describe('logger', () => {
  const originalThreshold = process.env.STORYGRAPH_SLOW_REQUEST_THRESHOLD_MS;
  const originalOptions = process.env.STORYGRAPH_LOG_OPTIONS;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined as unknown as void);
  });

  afterEach(() => {
    process.env.STORYGRAPH_SLOW_REQUEST_THRESHOLD_MS = originalThreshold;
    process.env.STORYGRAPH_LOG_OPTIONS = originalOptions;
    vi.restoreAllMocks();
  });

  it('logs request summaries with standard fields', () => {
    logRequestSummary({
      requestId: 'req-1',
      route: '/api/demo',
      method: 'GET',
      status: 200,
      durationMs: 10,
    });
    expect(console.log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((console.log as unknown as vi.Mock).mock.calls[0][0]);
    expect(payload).toMatchObject({
      event: 'request',
      requestId: 'req-1',
      route: '/api/demo',
      method: 'GET',
      status: 200,
      durationMs: 10,
      slow: false,
    });
    expect(payload.timestamp).toBeDefined();
  });

  it('marks slow requests when duration exceeds threshold', () => {
    process.env.STORYGRAPH_SLOW_REQUEST_THRESHOLD_MS = '5';
    logRequestSummary({
      requestId: 'req-2',
      route: '/api/demo',
      method: 'GET',
      status: 200,
      durationMs: 10,
    });
    const payload = JSON.parse((console.log as unknown as vi.Mock).mock.calls[0][0]);
    expect(payload.event).toBe('request.slow');
    expect(payload.slow).toBe(true);
  });

  it('hashes bearer tokens for prefix and omits when missing', () => {
    expect(getTokenHashPrefix(undefined)).toBeUndefined();
    const prefix = getTokenHashPrefix('Bearer secret-token');
    expect(prefix).toBeDefined();
    expect(prefix?.length).toBe(8);
  });

  it('logs OPTIONS only when slow/error/debug', () => {
    process.env.STORYGRAPH_SLOW_REQUEST_THRESHOLD_MS = '5';
    expect(shouldLogOptions(204, 1)).toBe(false);
    expect(shouldLogOptions(204, 10)).toBe(true);
    expect(shouldLogOptions(500, 1)).toBe(true);
    process.env.STORYGRAPH_LOG_OPTIONS = 'true';
    expect(shouldLogOptions(204, 1)).toBe(true);
  });
});
