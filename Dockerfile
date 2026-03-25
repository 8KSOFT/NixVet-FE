# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# postinstall precisa do script antes do npm ci (patch Node 23+)
COPY scripts ./scripts
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# ── Stage 2: Runner (standalone — sem node_modules, imagem mínima) ──────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Arquivos gerados pelo output: standalone
COPY --from=builder /app/.next/standalone ./
# Assets estáticos (JS/CSS do cliente)
COPY --from=builder /app/.next/static ./.next/static
# Arquivos públicos (favicon, imagens etc.)
COPY --from=builder /app/public ./public

EXPOSE 3000

# server.js gerado automaticamente pelo Next.js standalone
CMD ["node", "server.js"]
