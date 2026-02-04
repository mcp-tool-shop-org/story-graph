import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

export type ErrorBody = { code: string; message: string; requestId: string; details?: unknown };

const DEFAULT_CORS = process.env.STORYGRAPH_CORS_ORIGIN ?? '*';

function baseHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': DEFAULT_CORS,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, authorization, idempotency-key, if-match',
    'access-control-allow-methods': 'GET,POST,OPTIONS,HEAD',
  };
}

export function jsonResponse<T extends object>(
  data: T,
  init?: { status?: number; headers?: Record<string, string>; requestId?: string }
) {
  const requestId = init?.requestId ?? randomUUID();
  return NextResponse.json(
    { requestId, ...data },
    {
      status: init?.status ?? 200,
      headers: { ...baseHeaders(), ...(init?.headers ?? {}), 'x-request-id': requestId },
    }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  requestId?: string,
  headers?: Record<string, string>
) {
  requestId = requestId ?? randomUUID();
  const body: ErrorBody = { code, message, requestId, ...(details ? { details } : {}) };
  return NextResponse.json(body, {
    status,
    headers: { ...baseHeaders(), ...(headers ?? {}), 'x-request-id': requestId },
  });
}

export function ok(requestId?: string): Response {
  requestId = requestId ?? randomUUID();
  return new NextResponse(null, { status: 204, headers: { ...baseHeaders(), 'x-request-id': requestId } });
}

export function addRequestIdHeader(headers?: HeadersInit): { requestId: string; headers: Record<string, string> } {
  const requestId = randomUUID();
  return { requestId, headers: { ...baseHeaders(), ...(headers as Record<string, string>), 'x-request-id': requestId } };
}
