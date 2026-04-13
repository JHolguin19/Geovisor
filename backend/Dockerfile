# Dockerfile para el Backend Node.js — Producción
FROM node:18-alpine

WORKDIR /app

# Instalar solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

# IMPORTANTE: usar "start" (node) en producción, NO "dev" (nodemon)
CMD ["npm", "start"]
