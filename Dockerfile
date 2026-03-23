# Build (Node 22 LTS — alinhado com .nvmrc; evita Node 23 + Next 14)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# postinstall precisa do script antes do npm ci (layer de deps)
COPY scripts ./scripts
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Run
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
# Runtime não precisa do postinstall (patch só Node 23+; imagem é Node 22)
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
EXPOSE 3000
CMD ["npm", "run", "start"]
