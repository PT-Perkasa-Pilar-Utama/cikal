# Image cikal-api per manifest client (technical-specs 02 §2.4, DEPLOYMENT_PLAN §2.2). Satu image untuk service api,
# worker, dan migrate. Build dari root repo:
#   docker build -f apps/api/Dockerfile --build-arg MANIFEST=deploy/manifests/poc.json \
#     --build-arg LICENSE_KEY=deploy/license/ppu-license-public-key.pem -t cikal-api .
# Image rilis memakai kunci PPU; kunci dev hanya untuk build lokal (technical-specs 07 §7.6).

FROM node:22.23.0-bookworm-slim AS build
ARG MANIFEST=deploy/manifests/poc.json
ARG LICENSE_KEY=deploy/license/dev-license-public-key.pem
ENV CI=true
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Modul di luar manifest dihapus sebelum kompilasi agar kodenya tidak ada di image (PK-02).
RUN node tools/package-builder/prune.mjs --manifest "$MANIFEST" --src apps/api/src \
  && node tools/package-builder/generate.mjs --manifest "$MANIFEST" --license-key "$LICENSE_KEY" \
    --out apps/api/src/licensed-modules.generated.ts
RUN pnpm --filter "@cikal/api^..." run build && pnpm --filter @cikal/api run build
RUN pnpm --filter @cikal/api deploy --prod --legacy /out \
  && rm -rf /out/src /out/test /out/scripts /out/Dockerfile /out/.env.example /out/*.config.ts /out/nest-cli.json \
    /out/tsconfig.json /out/tsconfig.build.json \
  && cp -r apps/api/dist /out/dist

FROM gcr.io/distroless/nodejs22-debian12:nonroot
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out /app
EXPOSE 3000
# Compose memilih peran: `dist/main.js` (api), `dist/worker.js` (worker), atau entrypoint runner migrasi.
CMD ["dist/main.js"]
