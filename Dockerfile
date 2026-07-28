# Build stage: production Angular bundle (fileReplacements swaps in
# environment.prod.ts, whose apiBaseUrl is '' -- same-origin, proxied by
# nginx below).
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# Runtime stage: static files behind nginx, which also reverse-proxies
# /api/* to the Spring Boot container (Section 8) so the browser only ever
# talks to one origin.
FROM nginx:alpine
COPY --from=build /app/dist/arabic-book-web/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
