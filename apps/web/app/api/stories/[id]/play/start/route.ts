import { randomUUID } from 'node:crypto';
import { activeStoryStore } from '../../../../../../lib/story-store';
import { parseJsonWithLimit, rateLimit, requireAuth } from '../../../../../../lib/api-guards';
import { errorResponse, jsonResponse, ok } from '../../../../../../lib/http';
import { getTokenHashPrefix, logRequestSummary, logWithRequest, shouldLogOptions } from '../../../../../../lib/logger';
import { loadRuntimeFromContent, snapshot, start as runtimeStart, type RuntimeSnapshot } from '@storygraph/core';

function loadStoryContent(id: string, versionId?: string): { content: string; versionId: string } | null {
  if (versionId) {
    const version = activeStoryStore.getVersion(id, versionId);
    if (!version) return null;
    return { content: version.content, versionId: version.versionId };
  }
  const story = activeStoryStore.get(id);
  if (!story) return null;
  return { content: story.content, versionId: story.latestVersionId };
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = randomUUID();
  const started = performance.now();
  const tokenHashPrefix = getTokenHashPrefix(request.headers.get('authorization'));
  const finish = (response: Response, statusOverride?: number, fields?: Record<string, unknown>) => {
    logRequestSummary({
      requestId,
      route: '/api/stories/[id]/play/start',
      method: 'POST',
      status: statusOverride ?? response.status,
      durationMs: Math.round(performance.now() - started),
      storyId: params.id,
      versionId: fields?.versionId as string | undefined,
      tokenHashPrefix,
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

    const body = limited ?? {};
    const versionId = typeof body.versionId === 'string' ? body.versionId : undefined;
    const storyContent = loadStoryContent(params.id, versionId);
    if (!storyContent) return finish(errorResponse('not_found', 'Story not found', 404, undefined, requestId), 404);

    const runtime = loadRuntimeFromContent(storyContent.content, { storyId: params.id });
    const result = runtimeStart(runtime);
    if (result.error) {
      return finish(
        errorResponse(result.error.code, result.error.message, 400, { nodeId: result.error.nodeId }, requestId),
        400,
        { versionId: storyContent.versionId }
      );
    }

    const snap: RuntimeSnapshot = snapshot(runtime);
    logWithRequest('play:start', requestId, {
      storyId: params.id,
      versionId: storyContent.versionId,
      durationMs: Math.round(performance.now() - started),
    });
    return finish(
      jsonResponse(
        { frame: result.frame, state: snap, versionId: storyContent.versionId },
        { status: 200, requestId }
      ),
      200,
      { versionId: storyContent.versionId }
    );
  } catch (error) {
    return finish(errorResponse('runtime_start_failed', (error as Error).message, 500, undefined, requestId), 500);
  }
}

export function OPTIONS() {
  const started = performance.now();
  const response = ok();
  const durationMs = Math.round(performance.now() - started);
  if (shouldLogOptions(response.status, durationMs)) {
    logRequestSummary({
      requestId: response.headers.get('x-request-id') ?? randomUUID(),
      route: '/api/stories/[id]/play/start',
      method: 'OPTIONS',
      status: response.status,
      durationMs,
    });
  }
  return response;
}
