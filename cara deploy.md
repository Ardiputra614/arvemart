# Cara Deploy Arvemart ke VPS (pakai aaPanel)

```
Frontend : https://arvemart.com      (Next.js + PM2 standalone, port 3000)
Backend  : https://api.arvemart.com  (Go API + Docker, port 8080)
WA Engine: https://arvemart.com/wa-api (Node.js + PM2, port 4000)
Database : MySQL 8 (Docker, port 3307)
Cache    : Redis 7 (Docker, port 6379)
```

---

## 1. Persiapan VPS

### 1.1 Install aaPanel

```bash
# Ubuntu/Debian
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh
```

Catat URL, username, dan password setelah install selesai. Login ke aaPanel di `http://IP_VPS:8888`.

### 1.2 Install dependencies dari terminal

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# PM2
npm install -g pm2

# Git
sudo apt install -y git
```

### 1.3 Clone project

```bash
cd /www/wwwroot
git clone https://github.com/ardiputra/arvemart.git
```

> Path project: `/www/wwwroot/arvemart/`

### 1.4 Setup website di aaPanel

Buka aaPanel → **Website** → **Add site**:

| Domain | Tipe | Catatan |
|--------|------|---------|
| `arvemart.com` | Node project / Reverse Proxy | Frontend (port 3000) |
| `api.arvemart.com` | Reverse Proxy | Backend (port 8080) |

Install SSL Let's Encrypt untuk kedua domain dari menu **SSL** di aaPanel.

---

## 2. Pre-Deploy Checklist (WAJIB sebelum deploy)

### 2.1 Generate secret keys

```bash
# Jalankan di VPS
openssl rand -hex 32
# Copy hasilnya, kita butuh 2x (SECRET_JWT + SECRET_KEY)
```

### 2.2 Fix backend `.env.production`

Buka `api-arvemart-go/.env.production`, pastikan:

```bash
# Ganti secret keys (paste hasil openssl rand -hex 32)
SECRET_JWT=<paste_hasil_1>
SECRET_KEY=<paste_hasil_2>

# Fix URL WA Engine (yang sekarang salah)
WA_ENGINE_URL=https://arvemart.com/wa-api

# Ganti webhook secret (jangan pakai "secret"!)
DIGIFLAZZ_WEBHOOK_SECRET=<ganti_dengan_secret_yang_kuat>

# Ganti MySQL password (jangan pakai arveshop123)
DB_PASS=<password_baru>

# Pastikan Redis sudah benar (sesuaikan dengan docker-compose)
REDIS_ADDR=redis:6379
REDIS_PASSWORD=<password_baru>
```

**HAPUS** baris ini (ada GitHub token bocor):
```
#token password github=ghp_...
```

### 2.3 Fix frontend `.env.production`

Buka `arvemart/.env.production`:

```bash
# SECRET_JWT harus sama dengan backend
SECRET_JWT=<paste_hasil_1>
```

### 2.4 Fix MySQL password di docker-compose

Buka `api-arvemart-go/docker-compose.yml`:

```yaml
services:
  db:
    environment:
      MYSQL_ROOT_PASSWORD: <password_baru>
      MYSQL_PASSWORD: <password_baru>
```

**Pastikan** password di `docker-compose.yml` sama dengan `DB_PASS` di `.env.production`.

### 2.5 Update `docker-compose.yml` env_file

Pastikan baris ini ada dan benar:

```yaml
services:
  app:
    env_file:
      - .env
```

Karena `main.go` membaca file `.env` (bukan `.env.production`), maka saat deploy:
```bash
cd api-arvemart-go
cp .env.production .env
```

---

## 3. Deploy Backend (Go + Docker)

```bash
cd /www/wwwroot/arvemart/api-arvemart-go

# Copy env production ke .env (karena docker-compose baca .env)
cp .env.production .env

# Build & jalankan semua container
docker compose up -d --build
```

Yang akan jalan:

| Container | Port | Fungsi |
|-----------|------|--------|
| `api-arveshop-go` | 8080 | Go API server |
| `mysql-db` | 3307 | Database MySQL |
| `redis` | 6379 | Cache & job queue |
| `phpmyadmin` | 8081 | Admin DB (opsional) |

### Cek status & log

```bash
# Cek semua container hidup
docker compose ps

# Cek log backend
docker compose logs -f app

# Cek log MySQL
docker compose logs -f db
```

### Setup Reverse Proxy di aaPanel

Buka aaPanel → **Website** → klik `api.arvemart.com` → **Reverse Proxy**:

| Parameter | Nilai |
|-----------|-------|
| Proxy Name | `api-backend` |
| Target URL | `http://127.0.0.1:8080` |

Tambahkan custom Nginx config (klik **Config**):

```nginx
# WebSocket untuk real-time payment status
location /ws {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

# Uploads
location /uploads/ {
    proxy_pass http://127.0.0.1:8080;
}
```

---

## 4. Deploy Frontend (Next.js + PM2 Standalone)

```bash
cd /www/wwwroot/arvemart/arvemart

# Install dependencies
npm install

# Build
npm run build

# Copy static assets ke folder standalone
rm -rf .next/standalone/public
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

# Copy env ke standalone
cp .env.production .next/standalone/
```

### Jalankan dengan PM2

```bash
# Hapus process lama (kalau ada)
pm2 delete arvemart 2>/dev/null || true

# Start
pm2 start .next/standalone/server.js --name arvemart

# Simpan & auto-start saat reboot
pm2 save
pm2 startup
```

### Setup Node Project di aaPanel (Alternatif)

Buka aaPanel → **Website** → **Add site** → pilih **Node project**:

| Parameter | Nilai |
|-----------|-------|
| Domain | `arvemart.com` |
| Root Directory | `/www/wwwroot/arvemart/arvemart` |
| Startup File | `.next/standalone/server.js` |
| Node Version | 22.x |
| Port | 3000 |

### Atau pakai Reverse Proxy

Buka aaPanel → **Website** → klik `arvemart.com` → **Reverse Proxy**:

| Parameter | Nilai |
|-----------|-------|
| Proxy Name | `arvemart-frontend` |
| Target URL | `http://127.0.0.1:3000` |

Edit custom Nginx config:

```nginx
# WebSocket support
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Static assets
location /_next/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache_bypass $http_upgrade;
}

# WA Engine proxy
location /wa-api/ {
    rewrite ^/wa-api/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# Socket.IO untuk WA Engine
location /socket.io/ {
    proxy_pass http://127.0.0.1:4000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location /favicon.ico {
    proxy_pass http://127.0.0.1:3000;
}
```

### Cek log frontend

```bash
pm2 logs arvemart --lines 30 --nostream
```

---

## 5. Deploy WA Engine (Node.js + PM2)

```bash
cd /www/wwwroot/arvemart/arvemart/storage/app/wa-engine

# Install dependencies
npm install

# Jalankan dengan PM2
pm2 start server.js --name wa-engine

# Simpan
pm2 save
pm2 startup
```

WA Engine berjalan di port **4000** dan diakses melalui reverse proxy frontend di `/wa-api/`.

### Cek log WA Engine

```bash
pm2 logs wa-engine --lines 30 --nostream
```

---

## 6. Verifikasi

| URL | Harusnya |
|-----|----------|
| `https://arvemart.com` | Halaman home Next.js |
| `https://arvemart.com/login` | Halaman login |
| `https://api.arvemart.com` | `404 page not found` (normal, ga ada root route) |
| `https://api.arvemart.com/api/categories` | JSON response categories |
| `https://arvemart.com/wa-api/` | WA Engine response |

### Quick test dari terminal VPS

```bash
# Test backend
curl -s https://api.arvemart.com/api/categories | head -c 200

# Test frontend
curl -s -o /dev/null -w "%{http_code}" https://arvemart.com
# Harus: 200

# Test WebSocket
curl -s -o /dev/null -w "%{http_code}" https://api.arvemart.com/ws
# Harus: 101 (upgrade) atau 400 (tanpa WS header)
```

---

## 7. Rebuild / Update Deploy

Kalau ada update code dan mau deploy ulang:

### Backend

```bash
cd /www/wwwroot/arvemart/api-arvemart-go
git pull
cp .env.production .env
docker compose up -d --build
```

### Frontend

```bash
cd /www/wwwroot/arvemart/arvemart
git pull

# Hapus total build lama
rm -rf .next

# Build ulang
npm install
npm run build

# Copy static & public ke standalone
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.production .next/standalone/

# Restart PM2 (delete+start lebih aman daripada restart)
pm2 delete arvemart
pm2 start .next/standalone/server.js --name arvemart
pm2 save
```

### WA Engine

```bash
cd /www/wwwroot/arvemart/arvemart/storage/app/wa-engine
git pull
npm install
pm2 restart wa-engine
```

### Atau pakai script deploy otomatis

```bash
cd /www/wwwroot/arvemart/arvemart
chmod +x "langkah kalau pakai standalone.md"
./langkah\ kalau\ pakai\ standalone.md
```

---

## 8. Semua Secret Keys yang WAJIB diganti

Sebelum deploy production, generate dan ganti SEMUA ini:

| Variable | Lokasi | Cara generate |
|----------|--------|---------------|
| `SECRET_JWT` | Backend + Frontend `.env` | `openssl rand -hex 32` |
| `SECRET_KEY` | Backend `.env` | `openssl rand -hex 32` |
| `DB_PASS` | Backend `.env` + `docker-compose.yml` | Password kuat sendiri |
| `MYSQL_ROOT_PASSWORD` | `docker-compose.yml` | Password kuat sendiri |
| `REDIS_PASSWORD` | Backend `.env` + `docker-compose.yml` | Password kuat sendiri |
| `DIGIFLAZZ_WEBHOOK_SECRET` | Backend `.env` | `openssl rand -hex 16` |
| `CLOUDINARY_API_SECRET` | Backend `.env` | Dari Cloudinary dashboard |
| `IPAYMU_API_KEY` | Backend `.env` | Dari iPaymu dashboard (production) |
| `TELEGRAM_BOT_TOKEN` | Backend `.env` | Dari @BotFather |
| `APP_PASSWORD_GMAIL` | Backend `.env` | Dari Google App Passwords |

---

## 9. Troubleshooting

### Login tidak bekerja
- Pastikan `COOKIE_DOMAIN=.arvemart.com` di backend `.env`
- Pastikan `APP_ENV=PRODUCTION` (agar cookie pake Secure flag)
- Pastikan frontend akses `https://api.arvemart.com/api/me` (bukan `/api/auth/me`)

### CORS error di browser
- Cek `main.go` — domain sudah terdaftar di allowed origins
- Pastikan nginx reverse proxy backend sudah benar

### WebSocket tidak connect
- Pastikan nginx punya proxy untuk `/ws` dan `/socket.io/`
- Cek custom Nginx config di aaPanel

### Redis error
- Backend tetap jalan walau Redis mati (hanya refresh token & job queue terpengaruh)
- Kalau Redis di Docker: `docker compose ps` pastikan container hidup

### PM2 process mati
```bash
pm2 status
pm2 logs arvemart --lines 50 --nostream
# Kalau crash, cek errornya lalu:
pm2 restart arvemart
```

### Docker container mati
```bash
docker compose ps
docker compose logs --tail=50 app
# Restart:
docker compose restart app
# Atau rebuild:
docker compose up -d --build
```

### Database belum ada / kosong
```bash
# Jalankan seeder
docker exec -it api-arveshop-go ./app -seed
# Atau akses phpMyAdmin di http://IP_VPS:8081
```

### Banner kepotong/jelek
- Banner otomatis di-crop Cloudinary ke 16:9
- Upload banner dengan rasio mendekati 16:9 untuk hasil terbaik

---

## 10. Struktur File Penting

```
arvemart/
├── api-arvemart-go/
│   ├── .env.production      ← Config production (backend)
│   ├── .env                  ← Copy dari .env.production saat deploy
│   ├── docker-compose.yml   ← Backend + MySQL + Redis + phpMyAdmin
│   └── Dockerfile            ← Build Go API
├── arvemart/
│   ├── .env.production       ← Config production (frontend)
│   ├── ecosystem.config.js   ← PM2 config
│   ├── next.config.ts        ← Rewrite /api/* ke api.arvemart.com
│   ├── deploy.sh             ← Deploy script (standalone)
│   ├── langkah kalau pakai standalone.md ← Deploy script v2
│   ├── config frontend.md    ← Nginx config reference
│   └── storage/app/wa-engine/
│       ├── server.js         ← WA Engine entry point
│       └── package.json
└── cara deploy.md             ← File ini
```

---

## 11. Port Reference

| Service | Port | Akses |
|---------|------|-------|
| Frontend (PM2) | 3000 | Via `arvemart.com` (reverse proxy) |
| WA Engine (PM2) | 4000 | Via `arvemart.com/wa-api/` (nginx rewrite) |
| Backend (Docker) | 8080 | Via `api.arvemart.com` (reverse proxy) |
| MySQL (Docker) | 3307 | Internal only (jangan expose ke public) |
| Redis (Docker) | 6379 | Internal only (jangan expose ke public) |
| phpMyAdmin (Docker) | 8081 | `http://IP_VPS:8081` (matikan di production!) |
| aaPanel | 8888 | `http://IP_VPS:8888` |
