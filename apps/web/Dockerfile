# Stage 1: Build React static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package and Vite web app
RUN npm run build --workspace=@jedana/shared
RUN npm run build --workspace=apps/web

# Stage 2: Serve static files via Nginx
FROM nginx:alpine AS runner

# Copy built static files to Nginx html directory
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
