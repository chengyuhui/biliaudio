FROM "node:lts-alpine"

# RUN apt-get update && apt-get install -y ffmpeg atomicparsley
RUN apk --no-cache --update upgrade && apk --no-cache add ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "index.js"]
