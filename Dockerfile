# TexStyle Wholesale Ltd — B2B Trade Portal (Node.js dynamic app)
# Build:  docker build -t texstyle-portal .
# Run:    docker run -d -p 3000:3000 -v texstyle-data:/app/db/data --name texstyle-portal texstyle-portal
FROM node:20-alpine

WORKDIR /app

# Bog'liqliklarni o'rnatish (cache qatlami uchun avval package.json)
COPY package*.json ./
RUN npm install --omit=dev

# Ilova kodi
COPY . .

# Ma'lumotlar bazasini boshlang'ich ma'lumot bilan to'ldirish (ag 'a bo'sh bo'lsa)
RUN node db/seed.js

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health-check (Docker darajasida)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
