# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.23.1-alpine3.24

FROM node:${NODE_VERSION} AS api-deps
WORKDIR /app/backend
COPY backend/infracciones-api/package*.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS api-builder
WORKDIR /app/backend
COPY --from=api-deps /app/backend/node_modules ./node_modules
COPY backend/infracciones-api/ ./
RUN npm run build
RUN npm prune --omit=dev

FROM node:${NODE_VERSION} AS api-production
ENV NODE_ENV=production
WORKDIR /app
RUN apk upgrade --no-cache libcrypto3 libssl3 \
  && mkdir -p /app/tmp \
  && chown -R node:node /app \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
  && rm -f \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/bin/corepack \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg \
    /usr/local/bin/pnpm \
    /usr/local/bin/pnpx
COPY --from=api-builder --chown=node:node /app/backend/package*.json ./
COPY --from=api-builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=api-builder --chown=node:node /app/backend/dist ./dist
USER node
EXPOSE 3104
CMD ["node", "dist/main.js"]

FROM node:${NODE_VERSION} AS web-builder
WORKDIR /app/frontend
COPY frontend/infracciones-web/package*.json ./
RUN npm ci
COPY frontend/infracciones-web/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ARG VITE_SOCKET_URL=/
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ARG VITE_SOCKET_PATH=/socket.io
ENV VITE_SOCKET_PATH=${VITE_SOCKET_PATH}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1-alpine3.24 AS web-production
USER root
RUN apk upgrade --no-cache libcrypto3 libssl3
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /app/frontend/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
