# Core Design

## Table of Contents

- [Core Design](#core-design)
- [Data model](#data-model)
- [Other Design Decisions That Were Rejected](#other-design-decisions-that-were-rejected)
- [Debugging walkthrough](#debugging-walkthrough)
- [Queryability](#queryability)
- [Performance & Scale](#performance--scale)
- [Developer Experience](#developer-experience)
- [Real-World Application](#real-world-application)
- [What Next??](#what-next)
- [API Specification](#api-specification)

<img width="1405" height="547" alt="hld" src="https://github.com/user-attachments/assets/64148946-785a-40f1-83f8-3710931c4f17" />

- SDK collects observations in memory and sends them via HTTP POST when `flow.finish()` is called (with exponential retry and jitter). Captures all or nothing.

- Server enqueues POST requests to a queue (BullMQ/Redis) to handle traffic spikes and prevent overload.

- Idempotency is enforced at queue and database levels using a UUID in the `idempotency-key` header to prevent duplicate processing.

- Metadata is stored in PostgreSQL; large observation JSON data is stored in S3 to optimize costs.

- Two-tier caching: Redis (server-side, 1hr TTL) reduces S3 calls; IndexedDB (client-side, 3 day TTL+ size over limit) enables instant filtering,reduces latency.

- Web Workers load observations asynchronously, checking IndexedDB first, then API, keeping UI responsive while loading large amount of data.

## Data model

<img width="633" height="856" alt="db schema" src="https://github.com/user-attachments/assets/572f62e6-2b42-4377-8a39-e56f3148be5a" />

Flow → Steps → Observations. Steps represent pipeline stages. Each step can have multiple observations to capture any data amount.

This provides flexibility to store/process multiple structures in a step, and capture multiple steps in a pipeline.

Fields: `idempotencyKey` in Flow prevents duplicate flows from retries. `position` in Step enables frontend line structure. `s3Url` stores heavy JSON data (not in PostgreSQL). `queryable` JSON field allows flexible filtering per observation (currently works for array of objects only). `version` field is half-baked for future work.

Alternate approaches considered:

- **Embedded JSON in PostgreSQL**: Store observations as JSONB with GIN indexes for smaller json data instead of S3. Rejected: would create two data sources (PostgreSQL + S3), adding complexity.

- **Columnar storage for queryable**: Store observations that have querables in ClickHouse for better analytics. Rejected: higher costs and additional infrastructure setup.

- **Fixed schemas per flow type**: Define typed schemas for specific steps (e.g., LLM steps). Rejected: assumes certain step types exist, reducing flexibility for unknown flow types.

## Other Design Decisions That Were Rejected

1. **_SQLite with Periodic Flush_** - Distributed systems face synchronization issues: steps running on different servers arrive out of order, server crashes lose data, partial flows visible before flush completes.

2. **_Athena for S3 Filtering_** - Cost and latency too high for interactive filtering. Athena better suited for large-scale analytics.

3. **_Columnar Databases_** - Require fixed schemas, conflicting with flexible JSON observations. Format conversion overhead and schema evolution complexity.

4. **_PostgreSQL JSONB for All Data_** - Storage cost higher than S3.

## Debugging walkthrough

They would need to see the particular flow, the particular step, and the particular observation that they have captured, to see what data is present/absent.

## Queryability

**Current state**: Cross-pipeline queries (e.g., "Show me all runs where the filtering step eliminated more than 90% of candidates") are not supported. Current filtering works only within a single observation and only for array of objects in the `queryable` field.

**Cross-pipeline query solution**: Use a query engine like AWS Athena to scan unstructured JSON data in S3. Implementation:

- API endpoint accepts user queries
- Queries Athena which scans S3 observation data
- Results returned to UI
- Trade-offs: Higher cost and latency due to full data scans

**Developer constraints for new query setup**:

- Step `name` must be consistent across pipelines (e.g., "filtering", "llm_call") to enable cross-pipeline queries

**Variability handling**: The generic data model (Flow → Steps → Observations) supports any pipeline structure since:

- Observations stored as unstructured JSON in S3
- No schema constraints on observation content
- Step names provide semantic meaning for cross-pipeline queries
- Works across diverse use cases without schema changes

## Performance & Scale

**Storage strategy**: Currently, large unstructured observation data is stored in cold storage (S3 or cheaper alternatives) rather than PostgreSQL. This reduces storage costs for high-volume data.

**Handling large datasets** (e.g., 5,000 candidates filtered to 30):

- **Storage**: Current implementation stores observation data in S3, keeping PostgreSQL lean with only metadata
- **Transfer**: Current implementation loads complete data, which can cause HTTP failures for large payloads. Solution: implement streaming to prevent failures
- **Frontend display**: Current UI shows all data, which is problematic for large observations. Solution: virtual scrolling + infinite scroll to show limited data in viewport

**Trade-offs**:

- **Completeness vs. Cost**: Full data capture (5,000 candidates with rejection reasons) increases storage costs but provides complete trail
- **Completeness vs. Performance**: Large payloads slow down transfer and UI rendering
- **Current approach**: Store everything in S3 (low cost), but optimize transfer and display

**Developer control**: Developers have complete control over what gets captured. They decide:

## Developer Experience

**Minimal setup**: create flow → create step → capture observation → finish step → finish flow.

**Full instrumentation**: repeat create step → capture observations → finish step multiple times before finishing flow.

**Example**:

```
import { createFlow } from '@flow-trail/sdk';

const flow = createFlow('my_pipeline');
const step = flow.createStep('processing');
step.capture({ name: 'any-name', data: { any-data} });
step.capture({ name: 'any-name', data: { any-data } });
step.finish({ status: 'completed', reason: 'any-reason' });
await flow.finish(); // Sends all data to server
```

**Backend unavailability**:

- SDK collects observations in memory during execution
- `flow.finish()` sends data with exponential backoff retries (configurable)
- If all retries fail, `flow.finish()` throws an error
- Developers should call `flow.finish()` asynchronously to prevent SDK failures from disrupting pipeline execution

## Real-World Application

Have worked on building a customer support agent, it would have saved time there.
**Retrofitting**: Minimal code changes,explicitly add steps and observation that needs to captured. Few extra line of code for data preparation that needs to be captured.

## What Next??

- TODO's present in the codebase
- PII data encryption
- Multi-step push: Send observations incrementally to preserve partial data on flow failure
- Cross pipeline queryability
- HTTP streaming: Stream large payloads, batch for small flows
- Team-based API keys and rate limiting
- Memory management: Clear SDK state after pushing data to server to prevent leaks
- Server-Sent Events: Real-time dashboard updates
- Versioning: Implement proper versioning to prevent loss of data that may happen due to retries of step/flow.
- Progressive loading: load observation data on-demand instead of all at once

## API Specification

### Endpoints

1. **POST** `/api/flows`
   - **Headers**: `idempotency-key: <UUID>` (required)
   - **Request Body**:
     ````{
     flow: {
     name: string;
     createdAt: string; // ISO date
     finishedAt: string | null; // ISO date
     };
     steps: Array<{
     name: string;
     version: number;
     flow: string;
     createdAt: string;
     position: number;
     status: 'pending' | 'running' | 'completed' | 'failed';
     reason: string;
     startedAt: string | null;
     finishedAt: string | null;
     observations: Array<{
     name: string;
     version: number;
     step: string;
     queryable?: Record<string, string | number | boolean | null>;
     data: any; // Stored in S3
     }>;
     }>;
     }- **Response**: `202 Accepted`
     {
     message: 'Flow accepted for processing';
     flowName: string;
     }```
     ````

2) **GET** `/api/flows?page=1&limit=20`
   - **Query Params**: `page` (default: 1), `limit` (default: 20)
   - **Response**: `200 OK`
     ```{
        flows: Array<{
        id: string;
        name: string;
        createdAt: string;
        finishedAt: string | null;
        }>;
        pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        };
        }
     ```

3) **GET** `/api/flows/:id`
   - **Response**: `200 OK` (metadata only, no observation data)

     ```{
     id: string;
     name: string;
     createdAt: string;
     finishedAt: string | null;
     steps: Array<{
     id: string;
     name: string;
     version: number;
     position: number;
     status: string;
     reason: string;
     startedAt: string | null;
     finishedAt: string | null;
     createdAt: string;
     observations: Array<{
     id: string;
     name: string;
     version: number;
     s3Url: string;
     queryable: Record<string, string | number | boolean | null> | null;
     createdAt: string;
     // data not included
     }>;
     }>;
     }

     ```

4) **GET** `/api/flows/:id/details`
   - **Response**: `200 OK` (includes observation data from S3)
     ````{
     id: string;
     name: string;
     createdAt: string;
     finishedAt: string | null;
     steps: Array<{
     // ... same as above
     observations: Array<{
     // ... same as above
     data: any; // Full observation data loaded from S3
     }>;
     }>;
     }```
     ````

5) **GET** `/health`
   - **Response**: `200 OK`script
     ````{
     status: 'ok';
     timestamp: string; // ISO date
     }```
     ````
