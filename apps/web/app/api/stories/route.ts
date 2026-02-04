import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../lib/story-store';
import { parseJsonWithLimit, rateLimit, requireAuth } from '../../../lib/api-guards';
import {
  getTokenHashPrefix,
  logRequestSummary,
  logWithRequest,
  shouldLogOptions,
} from '../../../lib/logger';
import { errorResponse, jsonResponse, ok } from '../../../lib/http';

export async function GET(request: Request) {
  const requestId = randomUUID();
  const started = performance.now();

  // Parse query parameters for search/filtering
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? undefined;
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  const sortParam = url.searchParams.get('sort');

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
  const validSorts = [
    'createdAt',
    '-createdAt',
    'title',
    '-title',
    'updatedAt',
    '-updatedAt',
  ] as const;
  const sort =
    sortParam && validSorts.includes(sortParam as (typeof validSorts)[number])
      ? (sortParam as (typeof validSorts)[number])
      : undefined;

  const result = activeStoryStore.search({ query, limit, offset, sort });

  const response = jsonResponse(
    {
      stories: result.stories,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    },
    { requestId }
  );

  logRequestSummary({
    requestId,
    route: '/api/stories',
    method: 'GET',
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    tokenHashPrefix: getTokenHashPrefix(request.headers.get('authorization')),
  });

  return response;
}

export function OPTIONS() {
  const started = performance.now();
  const response = ok();
  const durationMs = Math.round(performance.now() - started);
  if (shouldLogOptions(response.status, durationMs)) {
    logRequestSummary({
      requestId: response.headers.get('x-request-id') ?? randomUUID(),
      route: '/api/stories',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));
  const finish = (
    response: Response,
    statusOverride?: number,
    fields?: Record<string, unknown>
  ) => {
    logRequestSummary(
      {
        requestId,
        route: '/api/stories',
        method: 'POST',
        status: statusOverride ?? response.status,
        durationMs: Math.round(performance.now() - started),
        tokenHashPrefix,
      },
      fields
    );
    return response;
  };
  try {
    const limited = await parseJsonWithLimit(request, requestId);
    if (limited instanceof Response) return finish(limited);
    const auth = requireAuth(request, requestId);
    if (auth) return finish(auth);
    const limitedRate = rateLimit(request, { requestId });
    if (limitedRate) return finish(limitedRate);

    const body = limited;
    const content = typeof body.content === 'string' ? body.content : '';
    const title = typeof body.title === 'string' ? body.title : undefined;
    const record = activeStoryStore.create(content, title);
    logWithRequest('stories:create', requestId, {
      storyId: record.id,
      durationMs: Math.round(performance.now() - started),
    });
    return finish(
      jsonResponse(
        { story: record, latestVersionId: record.latestVersionId },
        { status: 201, requestId }
      ),
      201,
      {
        storyId: record.id,
        versionId: record.latestVersionId,
      }
    );
  } catch (error) {
    const err = error as Error;
    if (err.name === 'PayloadTooLargeError') {
      return finish(
        errorResponse('payload_too_large', err.message, 413, undefined, requestId),
        413
      );
    }
    if (err.name === 'StoryTooLargeError') {
      return finish(errorResponse('story_too_large', err.message, 400, undefined, requestId));
    }
    return finish(errorResponse('bad_request', err.message, 400, undefined, requestId));
  }
}
