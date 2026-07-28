FROM node:20-alpine

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
