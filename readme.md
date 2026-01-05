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

See [architecture.md](./architecture.md) for detailed design decisions, data model, and technical architecture.
