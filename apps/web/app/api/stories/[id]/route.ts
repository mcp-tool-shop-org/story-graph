import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../lib/story-store';
import { SQLiteStoryStore } from '../../../../lib/persistence/sqlite-story-store';
import { parseJsonWithLimit, rateLimit, requireAuth } from '../../../../lib/api-guards';
import {
  getTokenHashPrefix,
  logRequestSummary,
  logWithRequest,
  shouldLogOptions,
} from '../../../../lib/logger';
import { errorResponse, jsonResponse, ok } from '../../../../lib/http';

const IDEMPOTENCY_TTL_MS = Number(process.env.STORYGRAPH_IDEMPOTENCY_TTL_MS ?? 10 * 60 * 1000);
const idempotencyCache = new Map<
  string,
  {
    bodyHash: string;
    response: { storyId: string; versionId: string; createdAt: string };
    expiresAt: number;
    requestId: string;
  }
>();

function hashBody(body: unknown): string {
  const str = JSON.stringify(body);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(16);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const story = activeStoryStore.get(params.id);
  if (!story) {
    const response = errorResponse('not_found', 'Not found', 404, undefined, requestId);
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]',
      method: 'GET',
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      tokenHashPrefix: getTokenHashPrefix(request.headers.get('authorization')),
    });
    return response;
  }
  const response = jsonResponse({ story, latestVersionId: story.latestVersionId }, { requestId });
  logRequestSummary({
    requestId,
    route: '/api/stories/[id]',
    method: 'GET',
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    storyId: params.id,
    versionId: story.latestVersionId,
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
      route: '/api/stories/[id]',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));

  const finish = (response: Response) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]',
      method: 'DELETE',
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

    const deleted = activeStoryStore.delete(params.id);

    if (!deleted) {
      return finish(errorResponse('not_found', 'Story not found', 404, undefined, requestId));
    }

    return finish(jsonResponse({ deleted: true, id: params.id }, { status: 200, requestId }));
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
      route: '/api/stories/[id]',
      method: 'POST',
      status: statusOverride ?? response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      tokenHashPrefix,
      idempotencyHit: fields?.idempotencyHit as boolean | undefined,
      idempotencyAgeMs: fields?.idempotencyAgeMs as number | undefined,
      versionId: fields?.versionId as string | undefined,
    });
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
    if (typeof body.content !== 'string') {
      return errorResponse(
        'invalid_content',
        'content must be a YAML string',
        400,
        undefined,
        requestId
      );
    }

    const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;
    const bodyHash = hashBody(body);
    if (idempotencyKey) {
      const persistedHit =
        activeStoryStore instanceof SQLiteStoryStore
          ? activeStoryStore.getIdempotency(idempotencyKey)
          : undefined;
      if (persistedHit) {
        if (persistedHit.requestHash !== bodyHash) {
          return finish(
            errorResponse(
              'idempotency_conflict',
              'Idempotency-Key already used with different payload',
              409,
              undefined,
              requestId
            ),
            409,
            {
              idempotencyHit: true,
              idempotencyAgeMs: Date.now() - new Date(persistedHit.createdAt).getTime(),
            }
          );
        }
        return finish(
          jsonResponse(
            {
              storyId: persistedHit.storyId,
              versionId: persistedHit.versionId,
              createdAt: persistedHit.createdAt,
            },
            { status: 200, requestId: persistedHit.requestId ?? requestId }
          ),
          200,
          {
            idempotencyHit: true,
            idempotencyAgeMs: Date.now() - new Date(persistedHit.createdAt).getTime(),
            versionId: persistedHit.versionId,
          }
        );
      }

      const cached = idempotencyCache.get(idempotencyKey);
      const notExpired = cached && cached.expiresAt > Date.now();
      if (cached && cached.bodyHash !== bodyHash && notExpired) {
        return finish(
          errorResponse(
            'idempotency_conflict',
            'Idempotency-Key already used with different payload',
            409,
            undefined,
            requestId
          ),
          409,
          { idempotencyHit: true, idempotencyAgeMs: cached.expiresAt - Date.now() }
        );
      }
      if (cached && notExpired) {
        return finish(
          jsonResponse(cached.response, { status: 200, requestId: cached.requestId }),
          200,
          {
            idempotencyHit: true,
            idempotencyAgeMs: cached.expiresAt - Date.now(),
            versionId: cached.response.versionId,
          }
        );
      }
      if (cached && !notExpired) {
        idempotencyCache.delete(idempotencyKey);
      }
    }

    const expected =
      typeof body.expectedVersionId === 'string'
        ? body.expectedVersionId
        : (request.headers.get('if-match') ?? undefined);
    const updated = activeStoryStore.save(params.id, body.content, expected);
    const latest = activeStoryStore.listVersions(params.id).at(-1);
    logWithRequest('stories:update', requestId, {
      storyId: params.id,
      versionId: updated.latestVersionId,
      durationMs: Math.round(performance.now() - started),
    });

    if (idempotencyKey) {
      const record = {
        bodyHash,
        response: {
          storyId: updated.id,
          versionId: updated.latestVersionId,
          createdAt: latest?.createdAt ?? updated.updatedAt,
        },
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        requestId,
      };
      idempotencyCache.set(idempotencyKey, record);
      if (activeStoryStore instanceof SQLiteStoryStore) {
        activeStoryStore.saveIdempotency(idempotencyKey, {
          storyId: record.response.storyId,
          versionId: record.response.versionId,
          requestHash: bodyHash,
          requestId: record.requestId,
        });
      }
    }

    return finish(
      jsonResponse(
        {
          storyId: updated.id,
          versionId: updated.latestVersionId,
          createdAt: latest?.createdAt ?? updated.updatedAt,
        },
        { status: 200, requestId }
      ),
      200,
      { versionId: updated.latestVersionId, idempotencyHit: Boolean(idempotencyKey) }
    );
  } catch (error) {
    const err = error as Error;
    if (err.name === 'ConflictError') {
      return finish(
        errorResponse(
          'version_conflict',
          'Version conflict',
          409,
          { latestVersionId: activeStoryStore.get(params.id)?.latestVersionId },
          requestId
        ),
        409
      );
    }
    if (err.name === 'DatabaseUnavailableError') {
      return finish(
        errorResponse(
          'store_unavailable',
          'Database is busy, please retry',
          503,
          undefined,
          requestId
        ),
        503
      );
    }
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
