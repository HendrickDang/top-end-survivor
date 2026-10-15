FROM node:22-alpine
WORKDIR /app
COPY server/package*.json server/
RUN npm ci --omit=dev --prefix server
COPY server server
COPY web web
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/tes.sqlite
EXPOSE 8080
CMD ["node", "--no-warnings", "server/index.js"]
