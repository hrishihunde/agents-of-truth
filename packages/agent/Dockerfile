# ================================
# Multi-stage Dockerfile for Payments Agent
# ================================
#
# Build:
#   docker build -t payments-agent .
#
# Run:
#   docker run -p 3001:3001 --env-file .env payments-agent
#

# ================================
# Stage 1: Base with Node.js
# ================================
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# ================================
# Stage 2: Install Dependencies
# ================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# ================================
# Stage 3: Build
# ================================
FROM base AS builder

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# ================================
# Stage 4: Production Runtime
# ================================
FROM node:20-alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 agent
RUN adduser --system --uid 1001 agent

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Copy production dependencies from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy zk circuit files if they exist
COPY --from=builder /app/src/zk/circuit_js ./src/zk/circuit_js
COPY --from=builder /app/src/zk/*.zkey ./src/zk/
COPY --from=builder /app/src/zk/*.json ./src/zk/

# Copy OpenClaw config
COPY --from=builder /app/openclaw.config.json ./

# Set ownership
RUN chown -R agent:agent /app

# Switch to non-root user
USER agent

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start the agent
CMD ["node", "dist/index.js"]
