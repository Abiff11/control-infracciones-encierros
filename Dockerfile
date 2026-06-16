# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

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
RUN mkdir -p /app/tmp && chown -R node:node /app
COPY --from=api-builder --chown=node:node /app/backend/package*.json ./
COPY --from=api-builder --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=api-builder --chown=node:node /app/backend/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "const http=require('http');const port=process.env.PORT||3000;const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:3000},res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"
CMD ["node", "dist/main.js"]

FROM node:${NODE_VERSION} AS web-builder
WORKDIR /app/frontend
COPY frontend/infracciones-web/package*.json ./
RUN npm ci
COPY frontend/infracciones-web/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS web-production
COPY nginx/control-infracciones-encierros.conf /etc/nginx/conf.d/default.conf
COPY --from=web-builder /app/frontend/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
