# Deploy & Troubleshooting

## Deploy (self-hosted)
- Install Node 22+, pnpm/npm, and SQLite 3.41+.
- Set `STORYGRAPH_STORE=sqlite` and point `STORYGRAPH_SQLITE_PATH=/var/storygraph/data.db` (WAL is enabled by default).
- Optionally set `STORYGRAPH_RATE_LIMIT_TOKENS` / `STORYGRAPH_RATE_LIMIT_WINDOW_MS`, or disable with `STORYGRAPH_RATE_LIMIT_DISABLED=true` for trusted dev environments.
- If you rely on idempotency across replicas, keep the same `STORYGRAPH_SQLITE_PATH` (shared volume) and optionally tune `STORYGRAPH_IDEMPOTENCY_TTL_MS`.
- Start web: `npm run build -w storygraph-web && npm run start -w storygraph-web`.
- Health check: `GET /api/health` (returns requestId, build tag, and store status).

## Troubleshooting
- **Store unavailable (SQLITE_BUSY/LOCKED)**: check for long-running writes; WAL is enabled and `busy_timeout` is 5s. If needed, lower write concurrency or move SQLite to faster disk.
- **CORS failures**: ensure `STORYGRAPH_CORS_ORIGIN` matches the caller or use `*` during testing. Preflight is served by all story/play endpoints.
- **Idempotency conflicts**: the key is locked to a request hash for the TTL window; use a fresh `Idempotency-Key` per logical operation.
- **Rate limit exceeded**: see `STORYGRAPH_RATE_LIMIT_*` envs; limits are per token+route+client IP.
- **Invalid YAML**: use `/api/stories/{id}/validate` to get structured issues before saving.
