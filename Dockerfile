FROM node:18-alpine

WORKDIR /app

COPY package.json bun.lock* ./
RUN npm install -g bun
RUN bun install

COPY . .

EXPOSE 8081

CMD ["bun", "run", "start"]