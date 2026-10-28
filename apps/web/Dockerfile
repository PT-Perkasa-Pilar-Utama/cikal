# Image cikal-web: SPA hasil `vite build` di nginx (DEPLOYMENT_PLAN §2.2). Konfigurasi server dari template
# deploy/nginx yang di-mount compose, jadi image yang sama dipakai di semua lingkungan. Build dari root repo:
#   docker build -f apps/web/Dockerfile -t cikal-web .

FROM node:22.23.0-bookworm-slim AS build
ENV CI=true
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@cikal/web^..." run build \
  && pnpm --filter @cikal/web run generate \
  && pnpm --filter @cikal/web run build

FROM nginx:1.28.0-alpine
# Template aktif dibaca dari folder nginx VM (DEPLOYMENT_PLAN §2.4), bukan dari image.
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/cikal/templates
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
