FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json tsconfig.json ./
RUN pnpm install
COPY src ./src
RUN pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
RUN pnpm install --prod
COPY --from=builder /app/dist ./dist

RUN addgroup -S rtcstack && adduser -S rtcstack -G rtcstack
USER rtcstack

ENV API_PORT=3246
EXPOSE 3246

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=20s \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:3246/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["node", "dist/index.js"]
