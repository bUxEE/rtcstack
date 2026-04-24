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

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
  CMD node -e "process.exit(0)"

CMD ["node", "dist/index.js"]
