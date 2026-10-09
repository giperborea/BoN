# Пилот: один контейнер, SQLite в томе /app/db
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DATABASE_URL="file:/app/db/school.db" NODE_ENV=production
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "mkdir -p /app/db && npx prisma db push --skip-generate && if [ ! -f /app/db/.seeded ]; then npx tsx prisma/seed.ts && touch /app/db/.seeded; fi && npm run start"]
