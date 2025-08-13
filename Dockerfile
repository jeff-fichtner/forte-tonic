# Multi-stage Docker build for Node.js app
# Optimized for Google Cloud Run deployment

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Run build checks and generate any build artifacts
RUN npm run format:check && npm run lint

# Production stage
FROM node:18-alpine AS production

# Install security updates and required tools
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/config ./config
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nodejs:nodejs /app/start.js ./
COPY --from=builder --chown=nodejs:nodejs /app/.env* ./

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Add health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Set production environment by default
ENV NODE_ENV=staging

# Start the application
CMD ["npm", "start"]

# Metadata labels
LABEL maintainer="ndemoss-mcds" \
      description="Tonic - Student registration automation" \
      version="1.0.0"
