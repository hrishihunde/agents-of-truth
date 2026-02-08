# Agents of Truth - Makefile
# ============================

.PHONY: install dev dev-web dev-agent build test clean zk-compile help

# Colors
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

help:
	@echo "$(CYAN)Agents of Truth$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make install     - Install all dependencies"
	@echo "  make dev         - Run both frontend and agent (requires tmux)"
	@echo "  make dev-web     - Run frontend only (port 3000)"
	@echo "  make dev-agent   - Run agent backend only (port 3001)"
	@echo ""
	@echo "$(GREEN)Build:$(RESET)"
	@echo "  make build       - Build all packages"
	@echo "  make build-web   - Build frontend only"
	@echo "  make build-agent - Build agent only"
	@echo ""
	@echo "$(GREEN)ZK Circuits:$(RESET)"
	@echo "  make zk-compile  - Compile Circom circuits"
	@echo "  make zk-test     - Test ZK proof generation"
	@echo ""
	@echo "$(GREEN)Testing:$(RESET)"
	@echo "  make test        - Run all tests"
	@echo "  make test-ens    - Test ENS resolution"
	@echo "  make test-zk     - Test ZK proofs"
	@echo ""
	@echo "$(GREEN)Other:$(RESET)"
	@echo "  make clean       - Remove build artifacts"
	@echo "  make docker      - Build and run with Docker"

# ============================================================
# Installation
# ============================================================

install:
	pnpm install

# ============================================================
# Development
# ============================================================

dev:
	@command -v tmux >/dev/null 2>&1 || { echo "tmux required. Install with: sudo apt install tmux"; exit 1; }
	@tmux new-session -d -s agents 'cd packages/agent && pnpm dev' \; \
		split-window -h 'cd packages/web && pnpm dev' \; \
		attach

dev-web:
	cd packages/web && pnpm dev

dev-agent:
	cd packages/agent && pnpm dev

# ============================================================
# Build
# ============================================================

build: build-agent build-web

build-web:
	cd packages/web && pnpm build

build-agent:
	cd packages/agent && pnpm build

# ============================================================
# ZK Circuits
# ============================================================

zk-compile:
	cd packages/agent && pnpm zk:compile

zk-test:
	cd packages/agent && pnpm test:zk

# ============================================================
# Testing
# ============================================================

test: test-ens test-zk

test-ens:
	cd packages/agent && pnpm test:ens

test-zk:
	cd packages/agent && pnpm test:zk

# ============================================================
# Docker
# ============================================================

docker:
	docker-compose up --build

docker-down:
	docker-compose down

# ============================================================
# Cleanup
# ============================================================

clean:
	rm -rf packages/web/.next
	rm -rf packages/agent/dist
	rm -rf packages/agent/src/zk/build
	rm -rf node_modules/.cache
