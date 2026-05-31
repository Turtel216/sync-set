# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts && \
    npx prisma generate


# ---- Stage 2: Build TypeScript ----
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npx tsc


# ---- Stage 3: Production image ----
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
