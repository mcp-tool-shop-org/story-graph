import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../lib/story-store';
import { jsonResponse, errorResponse } from '../../../../lib/http';
import { getTokenHashPrefix, logRequestSummary } from '../../../../lib/logger';

export async function GET(request: Request) {
  const requestId = randomUUID();
  const started = performance.now();
  const storeHealth = activeStoryStore.health();
  if (!storeHealth.ok) {
    const response = errorResponse('store_unhealthy', storeHealth.reason ?? 'Store unavailable', 503, undefined, requestId);
    logRequestSummary({
      requestId,
      route: '/api/health',
      method: 'GET',
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      tokenHashPrefix: getTokenHashPrefix(request.headers.get('authorization')),
    });
    return response;
  }
  const version = process.env.GIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown';
  const buildTag = process.env.BUILD_TAG ?? 'local';
  const response = jsonResponse({ status: 'ok', version, buildTag, store: 'story-store' }, { requestId });
  logRequestSummary({
    requestId,
    route: '/api/health',
    method: 'GET',
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    tokenHashPrefix: getTokenHashPrefix(request.headers.get('authorization')),
  });
  return response;
}
