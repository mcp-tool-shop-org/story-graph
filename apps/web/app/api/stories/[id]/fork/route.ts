import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../../lib/story-store';
import { SQLiteStoryStore } from '../../../../../lib/persistence/sqlite-story-store';
import { rateLimit, requireAuth } from '../../../../../lib/api-guards';
import { getTokenHashPrefix, logRequestSummary, logWithRequest } from '../../../../../lib/logger';
import { errorResponse, jsonResponse } from '../../../../../lib/http';

const IDEMPOTENCY_TTL_MS = Number(process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS ?? 10 * 60 * 1000);
const forkIdempotencyCache = new Map<
  string,
  {
    sourceStoryId: string;
    response: { storyId: string; versionId: string; createdAt: string; forkedFrom: string };
    expiresAt: number;
    requestId: string;
  }
>();

/**
 * POST /api/stories/[id]/fork
 * Fork (clone) a story, creating a new story with the same content
 *
 * Request body (optional):
 * {
 *   title?: string; // Custom title for the forked story (default: "[Original Title] (Fork)")
 * }
 *
 * Headers:
 *   Idempotency-Key: <string> - Optional key to ensure idempotent fork operation
 *
 * Response:
 * {
 *   storyId: string;
 *   versionId: string;
 *   createdAt: string;
 *   forkedFrom: string; // Original story ID
 * }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));

  const finish = (
    response: Response,
    statusOverride?: number,
    fields?: Record<string, unknown>
  ) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]/fork',
      method: 'POST',
      status: statusOverride ?? response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      tokenHashPrefix,
      ...(fields ?? {}),
    });
    return response;
  };

  try {
    const auth = requireAuth(request, requestId);
    if (auth) return finish(auth);
    const limitedRate = rateLimit(request, { requestId });
    if (limitedRate) return finish(limitedRate);

    // Check idempotency key
    const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;
    if (idempotencyKey) {
      // Check persisted idempotency
      if (activeStoryStore instanceof SQLiteStoryStore) {
        const persistedHit = activeStoryStore.getIdempotency(idempotencyKey);
        if (persistedHit) {
          return finish(
            jsonResponse(
              {
                storyId: persistedHit.storyId,
                versionId: persistedHit.versionId,
                createdAt: persistedHit.createdAt,
                forkedFrom: params.id,
              },
              { status: 200, requestId: persistedHit.requestId ?? requestId }
            ),
            200,
            { idempotencyHit: true }
          );
        }
      }

      // Check in-memory cache
      const cached = forkIdempotencyCache.get(idempotencyKey);
      const notExpired = cached && cached.expiresAt > Date.now();
      if (cached && cached.sourceStoryId === params.id && notExpired) {
        return finish(
          jsonResponse(cached.response, { status: 200, requestId: cached.requestId }),
          200,
          { idempotencyHit: true }
        );
      }
      if (cached && cached.sourceStoryId !== params.id && notExpired) {
        return finish(
          errorResponse(
            'idempotency_conflict',
            'Idempotency-Key already used with different source story',
            409,
            undefined,
            requestId
          ),
          409,
          { idempotencyHit: true }
        );
      }
      if (cached && !notExpired) {
        forkIdempotencyCache.delete(idempotencyKey);
      }
    }

    // Get the source story
    const sourceStory = activeStoryStore.get(params.id);
    if (!sourceStory) {
      return finish(errorResponse('not_found', 'Story not found', 404, undefined, requestId));
    }

    // Parse request body for optional title override
    let title: string | undefined;
    try {
      const body = (await request.json()) as { title?: string };
      if (body && typeof body.title === 'string' && body.title.trim()) {
        title = body.title.trim();
      }
    } catch {
      // No body or invalid JSON - that's fine, we'll use default title
    }

    // Create the fork with default title if not provided
    const forkTitle = title ?? `${sourceStory.title} (Fork)`;
    const forkedStory = activeStoryStore.create(sourceStory.content, forkTitle);

    logWithRequest('stories:fork', requestId, {
      sourceStoryId: params.id,
      forkedStoryId: forkedStory.id,
      durationMs: Math.round(performance.now() - started),
    });

    const responseData = {
      storyId: forkedStory.id,
      versionId: forkedStory.latestVersionId,
      createdAt: forkedStory.createdAt,
      forkedFrom: params.id,
    };

    // Cache idempotency
    if (idempotencyKey) {
      const record = {
        sourceStoryId: params.id,
        response: responseData,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        requestId,
      };
      forkIdempotencyCache.set(idempotencyKey, record);

      if (activeStoryStore instanceof SQLiteStoryStore) {
        activeStoryStore.saveIdempotency(idempotencyKey, {
          storyId: forkedStory.id,
          versionId: forkedStory.latestVersionId,
          requestHash: params.id, // Use source story ID as hash for fork operations
          requestId,
        });
      }
    }

    return finish(jsonResponse(responseData, { status: 201, requestId }), 201, {
      forkedStoryId: forkedStory.id,
      versionId: forkedStory.latestVersionId,
    });
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
    if (err.name === 'StoryTooLargeError') {
      return finish(errorResponse('story_too_large', err.message, 400, undefined, requestId));
    }
    return finish(errorResponse('internal_error', err.message, 500, undefined, requestId));
  }
}
