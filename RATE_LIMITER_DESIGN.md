# Rate Limiter Design & Observability

## Overview

The rate limiter uses token-bucket algorithm with in-memory storage. To prevent unbounded growth under high-cardinality client patterns, it includes TTL-based pruning, hard cap enforcement, and observability metrics.

## Configuration

All values are environment-tunable:

```bash
# Token bucket defaults
STORYGRAPH_RATE_LIMIT_WINDOW_MS=10000          # Window duration (ms)
STORYGRAPH_RATE_LIMIT_TOKENS=20                # Tokens per window

# Capacity & cleanup
STORYGRAPH_RATE_LIMIT_MAX_BUCKETS=50000        # Max buckets before saturation response
STORYGRAPH_RATE_LIMIT_MAX_BUCKET_TTL_MS=1800000  # 30 min: max age before prune
STORYGRAPH_RATE_LIMIT_SWEEP_INTERVAL=500       # Sweep every N requests

# Observability
STORYGRAPH_RATE_LIMIT_METRIC_LOG_INTERVAL_MS=60000  # Min ms between metric logs
STORYGRAPH_RATE_LIMIT_METRIC_LOG_SWEEPS=50        # Or: log every N sweeps
```

### Recommended for Public APIs

- `MAX_BUCKETS`: 50k (default)
- `MAX_BUCKET_TTL_MS`: 30 min (default)
- `SWEEP_INTERVAL`: 500 (default)

If you expect many unauthenticated clients or multi-tenant usage, increase `MAX_BUCKETS` and keep `MAX_BUCKET_TTL_MS` moderate (10–30 min).

## Saturation Response Contract

When a new unique client arrives and the bucket map has reached capacity:

1. **Pruning**: Oldest unused buckets (by `lastSeen`) are evicted first
2. **Logging**: `rate_limiter_capped` event is emitted with:
   - `bucketCount`: Current active buckets
   - `maxBuckets`: Configured cap
3. **Response** (if still capped after pruning):
   ```
   HTTP 503 Service Unavailable
   {
     "code": "rate_limiter_saturated",
     "message": "Rate limiter at capacity",
     "requestId": "<uuid>",
     "retry-after": 1
   }
   ```

**Key behavior**: Only _new_ unique clients are rejected; existing sessions continue to serve. This prevents attackers from evicting legitimate users.

## Observability Events

### `rate_limit_denied` (429)
Emitted when a client exceeds tokens:

```json
{
  "event": "rate_limit_denied",
  "requestId": "...",
  "route": "/api/stories",
  "method": "GET",
  "status": 429,
  "limitKey": "token_hash:route",
  "remaining": 0,
  "remainingBefore": -5,
  "retryAfterMs": 2500,
  "tokenHashPrefix": "abc123",
  "clientHash": "def456"
}
```

### `rate_limiter_capped` (503)
Emitted when bucket map reaches capacity:

```json
{
  "event": "rate_limiter_capped",
  "requestId": "...",
  "route": "/api/stories",
  "method": "POST",
  "bucketCount": 50000,
  "maxBuckets": 50000
}
```

### `rate_limiter_metrics` (periodic)
Aggregated metrics logged every 60s or every 50 sweeps:

```json
{
  "event": "rate_limiter_metrics",
  "sweepCount": 15023,
  "totalPrunedCount": 342,
  "totalDeniedCount": 1205,
  "activeBuckets": 1234
}
```

## Prune Strategy

**TTL-based**: Each bucket tracks `lastSeen`. On each sweep (every N requests):
- Calculate TTL as `min(windowMs * 2, MAX_BUCKET_TTL_MS)`
- Remove buckets where `now - lastSeen > TTL`

**Cap-based**: If a new key arrives and `buckets.size >= MAX_BUCKETS`:
- Sort by `lastSeen` ascending (oldest first)
- Prune until `buckets.size < MAX_BUCKETS`
- Only then allow the new key to be added

**Result**: Prevents memory leaks; maintains hot sessions; rejects excess new clients.

## Testing Helpers

```typescript
// Reset state and counter
import { resetRateLimits, sweepRateLimitsForTest, getRateLimitBucketCount } from './api-guards';

resetRateLimits();
sweepRateLimitsForTest();
const count = getRateLimitBucketCount();
```

## Monitoring Checklist

- [ ] `rate_limiter_metrics` emits every minute in production
- [ ] `rate_limiter_capped` events are rare (ideally zero)
- [ ] `rate_limit_denied` count is stable for known workload
- [ ] Bucket count does not grow unbounded
- [ ] No memory leaks over 24+ hour runs
