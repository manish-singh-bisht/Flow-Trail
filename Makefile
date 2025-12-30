.PHONY: help install install-all docker-up docker-down docker-restart build build-all start dev dev-all clean

# Default target
help:
	@echo "Flow Trail - Makefile Commands"
	@echo ""
	@echo "Installation:"
	@echo "  make install-all      - Install all dependencies (root + workspaces + demo + dashboard)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        - Start Docker services (postgres, redis, minio)"
	@echo "  make docker-down      - Stop Docker services"
	@echo "  make docker-restart   - Restart Docker services"
	@echo ""
	@echo "Build:"
	@echo "  make build-all        - Build all packages"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          - Run Prisma migrations"
	@echo "  make prisma-generate  - Generate Prisma client"
	@echo "  make db-studio        - Start Prisma studio"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start all dev servers (server, demo, dashboard)"
	@echo ""
	@echo "Environment:"
	@echo "  make setup-env        - Setup environment files"
	@echo "Setup:"
	@echo "  make setup            - Full setup: setup-env, install-all, docker-up, build-all, migrate"
	@echo ""

install-all:
	@echo "📦 Installing workspace dependencies..."
	npm install
	@echo "📦 Installing demo dependencies..."
	cd demo && npm install
	@echo "📦 Installing dashboard dependencies..."
	cd internal/dashboard && npm install
	@echo "📦 Installing SDK dependencies..."
	cd sdk && npm install
	@echo "📦 Installing shared dependencies..."
	cd shared && npm install
	@echo "📦 Installing server dependencies..."
	cd internal/server && npm install
	@echo "✅ All dependencies installed!"

# Docker targets
docker-up:
	@echo "🐳 Starting Docker services..."
	cd internal/server && docker-compose up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 5
	@echo "✅ Docker services started!"

docker-down:
	@echo "🐳 Stopping Docker services..."
	cd internal/server && docker-compose down
	@echo "✅ Docker services stopped!"

docker-restart: docker-down docker-up

# Build targets

build-all: install-all
	@echo "🔨 Building SDK..."
	cd sdk && npm run build
	@echo "🔨 Building shared..."
	cd shared && npm run build
	@echo "🔨 Building server..."
	cd internal/server && npm run build
	@echo "🔨 Building demo..."
	cd demo && npm run build
	@echo "🔨 Building dashboard..."
	cd internal/dashboard && npm run build
	@echo "✅ All packages built!"

# Database targets
migrate:
	@echo "🗄️  Running Prisma migrations..."
	cd internal/server && npm run prisma:migrate
	@echo "✅ Migrations completed!"

prisma-generate:
	@echo "🔧 Generating Prisma client..."
	cd internal/server && npm run prisma:generate
	@echo "✅ Prisma client generated!"

db-studio:
	@echo "🔍 Starting Prisma studio..."
	cd internal/server && npm run prisma:studio
	@echo "✅ Prisma studio started!"

# Development targets
dev-server:
	@echo "🚀 Starting server..."
	cd internal/server && npm run dev

dev-demo:
	@echo "🚀 Starting demo..."
	cd demo && npm run dev

dev-dashboard:
	@echo "🚀 Starting dashboard..."
	cd internal/dashboard && npm run dev

dev:
	@echo "🚀 Starting all dev servers..."
	@echo "⚠️  Note: This will start server, demo, and dashboard in parallel"
	@echo "⚠️  Use Ctrl+C to stop all services"
	@trap 'kill 0' EXIT; \
	cd sdk && npm run build & \
	cd internal/server && npm run dev & \
	cd demo && npm run dev & \
	cd internal/dashboard && npm run dev & \
	wait

setup-env:
	@echo "📋 Setting up environment files..."
	@if [ -f internal/server/.env.example ] && [ ! -f internal/server/.env ]; then \
		cp internal/server/.env.example internal/server/.env; \
		echo "✅ Created internal/server/.env"; \
	fi
	@if [ -f internal/dashboard/.env.example ] && [ ! -f internal/dashboard/.env ]; then \
		cp internal/dashboard/.env.example internal/dashboard/.env; \
		echo "✅ Created internal/dashboard/.env"; \
	fi


setup: setup-env install-all docker-up build-all migrate
