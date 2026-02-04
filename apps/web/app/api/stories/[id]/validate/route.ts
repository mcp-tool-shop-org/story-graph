import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../../lib/story-store';
import { parseJsonWithLimit, rateLimit, requireAuth } from '../../../../../lib/api-guards';
import { getTokenHashPrefix, logRequestSummary, logWithRequest, shouldLogOptions } from '../../../../../lib/logger';
import { errorResponse, jsonResponse, ok } from '../../../../../lib/http';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));
  const finish = (response: Response, statusOverride?: number, fields?: Record<string, unknown>) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]/validate',
      method: 'POST',
      status: statusOverride ?? response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      tokenHashPrefix,
      versionId: fields?.versionId as string | undefined,
    });
    return response;
  };
  try {
    const limited = await parseJsonWithLimit(request, requestId);
    if (limited instanceof Response) return finish(limited);
    const auth = requireAuth(request, requestId);
    if (auth) return finish(auth);
    const limitedRate = rateLimit(request, { maxTokens: 10, windowMs: 10_000, requestId });
    if (limitedRate) return finish(limitedRate);

    const body = limited;
    const content = typeof body.content === 'string' ? body.content : activeStoryStore.get(params.id)?.content ?? '';
    const result = activeStoryStore.validate(content);
    logWithRequest('stories:validate', requestId, {
      storyId: params.id,
      valid: result.valid,
      durationMs: Math.round(performance.now() - started),
    });
    return finish(jsonResponse(result, { requestId }), undefined, { versionId: activeStoryStore.get(params.id)?.latestVersionId });
  } catch (error) {
    return finish(errorResponse('bad_request', (error as Error).message, 400, undefined, requestId));
  }
}

export function OPTIONS() {
  const started = performance.now();
  const response = ok();
  const durationMs = Math.round(performance.now() - started);
  if (shouldLogOptions(response.status, durationMs)) {
    logRequestSummary({
      requestId: response.headers.get('x-request-id') ?? randomUUID(),
      route: '/api/stories/[id]/validate',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}
