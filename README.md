# TexStyle Wholesale Ltd — B2B Trade Portal

**Dinamik veb-ilova** (Node.js + Express). TexStyle ulgurji savdo kompaniyasining uchta biznes tizimini namoyish etadi:

- **ERP** → Mahsulot katalogi va jonli zaxira (`db.Products`)
- **CRM** → Do'kon (retailer) hisoblari va login (`db.Customers`)
- **WMS** → Buyurtmalar va ombor bajarilishi (`db.Orders`)

Sayt **server tomonidan dinamik render** qilinadi (EJS), JSON API'ga ega va EC2'da Nginx reverse proxy orqasida ishlaydi.

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Server | Node.js 20 + Express |
| Shablonlar | EJS (server-side rendering) |
| Ma'lumotlar bazasi | JSON fayl (development) / **Amazon RDS PostgreSQL** (production) |
| Autentifikatsiya | express-session + bcryptjs |
| Web-server | Nginx (reverse proxy 80/443 → 3000) |
| Jarayon menejeri | pm2 |
| Konteyner | Docker (node:20-alpine) |
| CI/CD | GitHub Actions |
| Bulut | AWS EC2 (Ubuntu 24.04), eu-west-2 |

> **Ma'lumotlar bazasi haqida:** mahalliy muhitda hech qanday native kompilyatsiya talab qilmaydigan JSON-fayl store ishlatiladi (`db/store.js`). Barcha so'rovlar shu yagona modul orqali o'tadi, shuning uchun production'da uni Amazon RDS (PostgreSQL) ga ulash uchun faqat shu faylni almashtirish kifoya.

---

## Lokal ishga tushirish

```bash
npm install
npm run seed      # ma'lumotlar bazasini boshlang'ich ma'lumot bilan to'ldiradi
npm start         # http://localhost:3000
```

**Demo hisoblar:**
- Do'kon: `demo@retailer.co.uk` / `texstyle2026`
- Ombor (admin): `admin@texstyle.co.uk` / `warehouse2026`

---

## Sahifalar va endpointlar

| Yo'l | Tavsif |
|---|---|
| `/` | Bosh sahifa (jonli statistika DB'dan) |
| `/catalogue` | Mahsulot katalogi, jonli zaxira, filtr |
| `/register`, `/login`, `/logout` | CRM — hisob va sessiya |
| `/cart`, `/checkout` | Savat va buyurtma berish |
| `/dashboard` | Do'kon paneli — buyurtmalar tarixi |
| `/admin` | Ombor paneli (WMS) — buyurtma holatini boshqarish |
| `/status` | Jonli tizim holati (dinamik terminal) |
| `/health` | Health-check (ALB target uchun) → 200 OK + JSON |
| `/api/products`, `/api/products/:id` | JSON API — mahsulotlar |
| `/api/stock/:sku` | Jonli zaxira darajasi |
| `/api/status` | Tizim holati (JSON) |

---

## EC2'ga deploy qilish (Windows'dan)

### 1. EC2 instance yaratish
- AWS Console → EC2 → **Launch instance**
- Ubuntu Server 24.04 LTS · **t3.micro** (Free Tier) · region **eu-west-2**
- Key pair: `texstyle-key.pem`
- Security Group: SSH (22, My IP), HTTP (80, Anywhere), HTTPS (443, Anywhere)
- **Advanced → User data**: `ec2_setup.sh` faylining ichini joylang (Node + pm2 + Nginx avtomatik o'rnatiladi)

### 2. GitHub'ga yuklash
Loyihani GitHub repo'ga yuklang (`texstyle-portal`). Brauzerda yoki:
```powershell
git init
git add .
git commit -m "TexStyle B2B portal"
git branch -M main
git remote add origin https://github.com/SIZNING-LOGIN/texstyle-portal.git
git push -u origin main
```

### 3. Serverga ulanish (Windows PowerShell)
```powershell
cd C:\Users\user\Desktop
icacls texstyle-key.pem /inheritance:r
icacls texstyle-key.pem /grant:r "$($env:USERNAME):(R)"
ssh -i texstyle-key.pem ubuntu@<EC2-IP>
```

### 4. Serverda clone + ishga tushirish
```bash
cd /var/www
git clone https://github.com/SIZNING-LOGIN/texstyle-portal.git
cd texstyle-portal
npm install
npm run seed
pm2 start ecosystem.config.js
pm2 startup        # reboot'da avtomatik ishlashi uchun (chiqgan buyruqni bajaring)
pm2 save
pm2 list           # "online" holatini ko'rsatadi
```

Nginx allaqachon `ec2_setup.sh` orqali sozlangan — brauzerda `http://<EC2-IP>` oching.

### 5. Domen + HTTPS
- DuckDNS: `texstyle.duckdns.org` → EC2 IP
- HTTPS: `sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d texstyle.duckdns.org`

---

## Docker bilan ishga tushirish (muqobil)
```bash
docker build -t texstyle-portal .
docker run -d -p 3000:3000 --restart always --name texstyle-portal texstyle-portal
docker ps
```

---

## CI/CD (GitHub Actions)

`.github/workflows/deploy.yml` — push qilinganda avtomatik:
1. **CI**: kod tekshiruvi, seed, health smoke-test
2. **CD**: EC2'ga SSH orqali `git pull` + `pm2 restart`

GitHub repo → **Settings → Secrets → Actions**:
- `EC2_HOST` = EC2 public IP
- `EC2_SSH_KEY` = `texstyle-key.pem` faylning to'liq matni

---

## Loyiha tuzilishi
```
texstyle-portal/
├── server.js               Express ilova (sessiya, health, status)
├── db/
│   ├── store.js            Ma'lumotlar bazasi qatlami (ERP/CRM/WMS)
│   └── seed.js             Boshlang'ich ma'lumot
├── routes/
│   ├── pages.js            Server-rendered sahifalar
│   └── api.js              JSON API
├── views/                  EJS shablonlar
├── public/css/styles.css   Selvedge dizayn tizimi
├── Dockerfile              Konteyner
├── nginx.conf              Reverse proxy
├── ecosystem.config.js     pm2
├── ec2_setup.sh            EC2 avtomatik o'rnatish
└── .github/workflows/      CI/CD pipeline
```
