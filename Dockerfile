# MetroDesk container for a public HTTPS host such as a Nebius AI Cloud Serverless Endpoint.
# Provider keys and login credentials are passed as environment variables at deploy time, never baked into the image.
FROM node:22-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p data records && chown -R node:node data records
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
