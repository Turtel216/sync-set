# Install dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci


# Build the Vite app
FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# Serve with nginx
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
