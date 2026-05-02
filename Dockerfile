FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

FROM node:20-alpine
WORKDIR /app
COPY --from=build-server /app/server/node_modules ./server/node_modules
COPY --from=build-server /app/server/package*.json ./server/
COPY server/ ./server/
COPY --from=build-client /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app/server
CMD ["node", "server.js"]
