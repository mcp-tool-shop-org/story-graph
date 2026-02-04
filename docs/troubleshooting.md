# Troubleshooting

## Database locked / busy
- Symptoms: 503 errors with code `store_unavailable`.
- Actions: ensure only one writer process; increase `busy_timeout`; check long-running transactions; retry with backoff.

## Auth token invalid
- Symptoms: 401 with code `unauthorized`.
- Actions: set `STORYGRAPH_API_TOKEN`; send `Authorization: Bearer <token>`; rotate by accepting both old/new during rollout.

## Payload too large
- Symptoms: 413 `Payload too large`.
- Actions: keep request bodies under 256KB or split content.

## 409 conflict
- Symptoms: 409 `version_conflict` when saving.
- Actions: fetch latest versionId from response, rebase changes, resend with `If-Match` or `expectedVersionId`.

## Idempotency conflicts
- Symptoms: 409 `idempotency_conflict`.
- Actions: reuse the same payload for that Idempotency-Key or choose a new key.
