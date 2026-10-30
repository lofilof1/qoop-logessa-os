FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates fonts-dejavu-core fontconfig && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3000
RUN mkdir -p /app/.runtime && chown node:node /app/.runtime
USER node
CMD ["npm", "start"]
