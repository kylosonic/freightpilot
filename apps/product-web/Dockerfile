FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline

FROM node:22-alpine AS build

WORKDIR /app
ARG NEXT_PUBLIC_PLATFORM_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_APP_CONSOLE_URL=http://localhost
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8081
ARG NEXT_PUBLIC_CONTACT_FORM_ENDPOINT=
ARG NEXT_PUBLIC_CONTACT_EMAIL=support@freightpilot.app
ENV NEXT_PUBLIC_PLATFORM_API_URL=$NEXT_PUBLIC_PLATFORM_API_URL
ENV NEXT_PUBLIC_APP_CONSOLE_URL=$NEXT_PUBLIC_APP_CONSOLE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CONTACT_FORM_ENDPOINT=$NEXT_PUBLIC_CONTACT_FORM_ENDPOINT
ENV NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Match Cloudflare Pages' static-export behavior locally.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
