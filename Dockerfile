FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY admin/ ./admin/
COPY *.html *.css *.js *.json *.xml *.txt ./
COPY images/ ./images/
COPY uploads/ ./uploads/

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server/server.js"]
