# syntax=docker/dockerfile:1

# ========================================
# Stage 1: Cài dependencies và build app
# ========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Chỉ giữ production dependencies cho runtime
RUN npm prune --omit=dev --legacy-peer-deps

# ========================================
# Stage 2: Runtime image tối giản
# ========================================
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000 \
    SSL_KEY_PATH=/app/ssl/key.pem \
    SSL_CERT_PATH=/app/ssl/cert.pem

# Chỉ copy các file cần thiết để chạy production
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --chown=appuser:appgroup generate-ssl.cjs ./generate-ssl.cjs
COPY --chown=appuser:appgroup docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p uploads ssl \
    && chown -R appuser:appgroup /app \
    && chmod +x docker-entrypoint.sh

USER appuser

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.cjs"]
