FROM node:12.18 AS base
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install && npm i express pg prom-client
COPY /src/*.js ./

FROM node:12.18-alpine AS release
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/package.json ./
RUN npm install --only=production && npm i express pg prom-client && rm -rf node_modules
COPY --from=base /usr/src/app ./
EXPOSE 8080
ENTRYPOINT ["node", "server.js"]