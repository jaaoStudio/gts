---
name: Docker Deployment
description: Docker build, nginx configuration, and deployment conventions for the GTS Web Store.
---

# Docker Deployment Conventions

## Multi-Stage Build

The `Dockerfile` uses a two-stage build:

### Stage 1: Builder (node:18-alpine)
```dockerfile
FROM nginx:alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

### Stage 2: Production (nginx:alpine)
```dockerfile
FROM nginx:alpine
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Docker Compose

```yaml
services:
  gts_web_store:
    build:
      context: .
      dockerfile: Dockerfile
    image: ${REMOTE_REGISTRY_IP}/gts/gts_web_store:${FRONTEND_VERSION}
    container_name: gts_web_store
    ports:
      - "9053:80"
    restart: always
```

### Required `.env.docker` Variables

| Variable | Purpose |
|---|---|
| `REMOTE_REGISTRY_IP` | Docker registry IP/hostname |
| `FRONTEND_VERSION` | Image version tag |

## Nginx

Custom config is placed at `nginx/nginx.conf`. It should:

- Serve static files from `/usr/share/nginx/html`.
- Handle SPA routing (`try_files $uri $uri/ /index.html`).
- Reverse proxy `/api` requests to Directus backend.

## Deployment Checklist

1. Set build-time env vars in `.env.docker` (registry IP + version).
2. Set Vite build-time env vars in `.env` (`VITE_DIRECTUS_URL`, `VITE_DIRECTUS_PUBLIC_URL`).
3. Build & push: `docker compose build && docker compose push`.
4. Deploy: `docker compose up -d`.

## Dev vs Production

| Aspect | Dev (`npm run dev`) | Production (Docker) |
|---|---|---|
| Server | Vite dev server (HTTPS, port 5174) | nginx (HTTP, port 80) |
| API Proxy | Vite `proxy` config → `gts-core.jaao.tw` | nginx reverse proxy |
| HTTPS | Auto via `mkcert` | Handled by reverse proxy / load balancer |
| Host | `local.jaao.tw` (allowedHosts) | Container hostname |
