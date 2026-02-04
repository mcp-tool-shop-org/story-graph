import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../../../lib/story-store';
import { rateLimit, requireAuth } from '../../../../../../lib/api-guards';
import {
  getTokenHashPrefix,
  logRequestSummary,
  shouldLogOptions,
} from '../../../../../../lib/logger';
import { errorResponse, jsonResponse, ok } from '../../../../../../lib/http';

/**
 * GET /api/stories/[id]/versions/[versionId]
 * Get a specific version of a story (including content)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; versionId: string } }
) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));

  const finish = (response: Response) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]/versions/[versionId]',
      method: 'GET',
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      versionId: params.versionId,
      tokenHashPrefix,
    });
    return response;
  };

  try {
    const auth = requireAuth(request, requestId);
    if (auth) return finish(auth);
    const limitedRate = rateLimit(request, { requestId });
    if (limitedRate) return finish(limitedRate);

    // Check if story exists
    const story = activeStoryStore.get(params.id);
    if (!story) {
      return finish(errorResponse('not_found', 'Story not found', 404, undefined, requestId));
    }

    const version = activeStoryStore.getVersion(params.id, params.versionId);
    if (!version) {
      return finish(errorResponse('not_found', 'Version not found', 404, undefined, requestId));
    }

    return finish(
      jsonResponse(
        {
          storyId: params.id,
          versionId: version.versionId,
          version: version.version,
          content: version.content,
          createdAt: version.createdAt,
          isLatest: version.versionId === story.latestVersionId,
        },
        { requestId }
      )
    );
  } catch (error) {
    const err = error as Error;
    if (err.name === 'DatabaseUnavailableError') {
      return finish(
        errorResponse(
          'store_unavailable',
          'Database is busy, please retry',
          503,
          undefined,
          requestId
        )
      );
    }
    return finish(errorResponse('internal_error', err.message, 500, undefined, requestId));
  }
}

export function OPTIONS() {
  const started = performance.now();
  const response = ok();
  const durationMs = Math.round(performance.now() - started);
  if (shouldLogOptions(response.status, durationMs)) {
    logRequestSummary({
      requestId: response.headers.get('x-request-id') ?? randomUUID(),
      route: '/api/stories/[id]/versions/[versionId]',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}
