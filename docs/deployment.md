# Deployment Guide

## Required environment
- STORYGRAPH_STORE: `sqlite` (default: in-memory)
- STORYGRAPH_SQLITE_PATH: absolute path to the SQLite file (e.g., `/var/lib/storygraph/data.db`)
- STORYGRAPH_API_TOKEN: bearer token for API requests (required in non-local environments)
- STORYGRAPH_AUTH_OPTIONAL: `true` only for local development
- STORYGRAPH_CORS_ORIGIN: allowed origin for API responses (default `*`)

## File permissions and DB location
- Place the SQLite file on durable storage with owner-only permissions (chmod 600).
- Keep WAL and SHM files in the same directory; avoid network filesystems when possible.

## Migrations
- On startup the SQLite store runs migrations recorded in `schema_migrations`.
- Upgrades: deploy new code, then restart the app to run pending migrations.

## Backup / restore (SQLite)
- Use `better-sqlite3` backup or copy the DB file while in WAL mode:
  - Stop writes or ensure low traffic.
  - Copy `data.db`, `data.db-wal`, and `data.db-shm` together.
- Restore: replace the DB files, then start the app; verify with `/api/health`.
