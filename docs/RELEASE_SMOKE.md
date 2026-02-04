# Release Smoke & Metadata

## Build Metadata
- `BUILD_TAG` and `GIT_SHA` are surfaced via `/api/health` response and `x-request-id` header.
- Ensure `STORYGRAPH_STORE=sqlite` with a persistent path for release builds and set `STORYGRAPH_CORS_ORIGIN` appropriately.

## Smoke Checklist
1. Install deps: `npm ci` (root) then `npm run build -w @storygraph/core` and `npm run build -w storygraph-web`.
2. Run tests: `npm test` (root) to cover core + SQLite store.
3. Start server: `npm run start -w storygraph-web` with envs set.
4. Health: `curl -i http://localhost:3000/api/health` (expect `status: ok`, build tag, and requestId header).
5. Create story: `POST /api/stories` with small sample YAML; verify 201 and `latestVersionId`.
6. Validate: `POST /api/stories/{id}/validate` (should return valid for sample).
7. Play start: `POST /api/stories/{id}/play/start` then `.../choose` to ensure snapshot/choices work.
8. Idempotency: repeat create/update with identical `Idempotency-Key` (should return cached response); change body to confirm conflict 409.
9. Rate limits: issue rapid POSTs to confirm 429 when limits apply (unless `STORYGRAPH_RATE_LIMIT_DISABLED=true`).
10. Stop server and confirm SQLite WAL files present at configured path.
