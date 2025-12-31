# Flow Trail

System for providing insights into multi-step processes, both deterministic and non-deterministic.

## Table of Contents

- [Components](#components)
- [Setup](#setup)
- [Usage](#usage)
- [Approach](#approach)
- [Other Design Decisions That Were Rejected](#other-design-decisions-that-were-rejected)
- [Future Improvements](#future-improvements)

## Components

- **SDK**: Library for capturing decision context
- **Server**: Backend API and workers for processing flows
- **Dashboard**: Web interface for visualizing decision trails

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm
- Docker

### Steps

1. Fork and clone the repo.
2. Run `make setup` for the first time. Ensure Docker is running.
3. To run, use `make dev`.

## Usage

See [usage.md](./usage.md) for detailed usage examples and API documentation.

## Approach

<img width="1405" height="547" alt="hld" src="https://github.com/user-attachments/assets/64148946-785a-40f1-83f8-3710931c4f17" />
<img width="633" height="856" alt="db schema" src="https://github.com/user-attachments/assets/572f62e6-2b42-4377-8a39-e56f3148be5a" />

- SDK collects all observations in memory and sends them via HTTP POST(`retried exponentially with jitter`) when `flow.finish()` is called. This `all-or-nothing approach simplifies implementation` and ensures complete flow data.

- Server receives POST requests and immediately `enqueues them to a durable queue (BullMQ/Redis)` to handle traffic spikes and prevent server overload.

- `Idempotency` is enforced at both `queue level (job deduplication) and database level`. A UUID is sent with each payload via the `idempotency-key` header and stored in the database to prevent duplicate processing.

- `Metadata and small details are stored in PostgreSQL`, while `large observation JSON data is stored in S3` to optimize storage costs.

- `Two-tier caching` since the data is immutable, Redis (server-side, 1hr TTL) reduces S3 calls; IndexedDB (client-side, 3 day TTL) enables instant filtering without network round-trips.

- `Web Worker` handle observation loading asynchronously, checking IndexedDB first then API, keeping UI responsive during data fetch.

## Other Design Decisions That Were Rejected

1. **_SQLite with Periodic Flush_** - Distributed systems face synchronization issues: steps running on different servers arrive out of order, server crashes lose data, partial flows visible before flush completes.

2. **_Athena for S3 Filtering_** - Cost and latency too high for interactive filtering. Athena better suited for large-scale analytics.

3. **_Columnar Databases_** - Require fixed schemas, conflicting with flexible JSON observations. Format conversion overhead and schema evolution complexity.

4. **_PostgreSQL JSONB for All Data_** - Storage cost higher than S3.

## Future Improvements

- TODO's present in the codebase
- PII data encryption
- Multi-step push: Send observations incrementally to preserve partial data on flow failure
- HTTP streaming: Stream large payloads, batch for small flows
- Team-based API keys and rate limiting
- Memory management: Clear SDK state after pushing data to server to prevent leaks
- Enhanced filtering: Cross-observation queries, full-text search, aggregations
- Server-Sent Events: Real-time dashboard updates
- Versioning: Implement proper versioning to prevent loss of data that may happen due to retries of step/flow.
