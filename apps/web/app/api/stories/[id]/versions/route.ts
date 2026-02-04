import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../../lib/story-store';
import { rateLimit, requireAuth } from '../../../../../lib/api-guards';
import { getTokenHashPrefix, logRequestSummary, shouldLogOptions } from '../../../../../lib/logger';
import { errorResponse, jsonResponse, ok } from '../../../../../lib/http';

/**
 * GET /api/stories/[id]/versions
 * List all versions of a story
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));

  const finish = (response: Response) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]/versions',
      method: 'GET',
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
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

    const versions = activeStoryStore.listVersions(params.id);

    // Return version metadata without content to reduce payload size
    const versionMeta = versions.map((v) => ({
      versionId: v.versionId,
      version: v.version,
      createdAt: v.createdAt,
    }));

    return finish(
      jsonResponse(
        {
          storyId: params.id,
          versions: versionMeta,
          total: versions.length,
          latestVersionId: story.latestVersionId,
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
      route: '/api/stories/[id]/versions',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}
