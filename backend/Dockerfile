# Dockerfile para el Backend Node.js — Producción
FROM node:18.20-alpine

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ejecutar como usuario no-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# IMPORTANTE: usar "start" (node) en producción, NO "dev" (nodemon)
CMD ["npm", "start"]
