# Cara Deploy Arvemart ke VPS

```
Frontend : https://arvemart.com  (Next.js + PM2 standalone)
Backend  : https://api.arvemart.com  (Go API + Docker)
WA Engine: https://arvemart.com/wa-api (Node.js + PM2)
Database : MySQL 8 (Docker)
Cache    : Redis 7 (Docker)
```

---

## 1. Persiapan Awal di VPS

### 1.1 Install dependencies

```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# PM2
npm install -g pm2

# Nginx
sudo apt install -y nginx

# Git
sudo apt install -y git

# Clone project
git clone https://github.com/your-repo/arvemart.git
cd arvemart
```

### 1.2 Setup SSL certificate

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Domain utama
sudo certbot --nginx -d arvemart.com -d www.arvemart.com

# Subdomain API
sudo certbot --nginx -d api.arvemart.com
```

### 1.3 Konfigurasi Nginx

Copy file `arveshop/config frontend.md` ke `/etc/nginx/sites-available/`:

```bash
sudo cp arveshop/config\ frontend.md /etc/nginx/sites-available/arvemart
sudo ln -s /etc/nginx/sites-available/arvemart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

> **Penting:** Update path SSL certificate di nginx config sesuai hasil certbot.

---

## 2. Deploy Backend (Docker)

```bash
cd api-arveshop-go

# Copy environment production
cp .env.production .env

# Wajib: ganti SECRET_JWT dan SECRET_KEY sebelum deploy!
#   SECRET_JWT = hasil dari: openssl rand -hex 32
#   SECRET_KEY = hasil dari: openssl rand -hex 32

# Build & jalankan
docker compose up -d --build
```

Yang akan jalan:
| Container | Port | Fungsi |
|-----------|------|--------|
| `api-arveshop-go` | 8080 | Go API server |
| `mysql-db` | 3307 | Database MySQL |
| `redis` | 6379 | Cache & job queue |
| `phpmyadmin` | 8081 | Admin DB (opsional) |

### Cek log backend:
```bash
docker compose logs -f app
```

---

## 3. Deploy WA Engine

Ada di `arveshop/storage/app/wa-engine/`:

```bash
cd arveshop/storage/app/wa-engine

# Install dependencies
npm install

# Jalankan dengan PM2
pm2 start index.js --name wa-engine

pm2 save
pm2 startup
```

---

## 4. Deploy Frontend (PM2 Standalone)

```bash
cd arveshop

# Copy env production
cp .env.production .env

# Install dependencies
npm install

# Build
npm run build

# Copy static assets ke standalone
rm -rf .next/standalone/public
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next/static
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

# Copy env ke standalone
cp .env.production .next/standalone/

# Jalankan dengan PM2
pm2 start .next/standalone/server.js --name arvemart

pm2 save
pm2 startup

PENTING

cd /www/wwwroot/arvemart

# hapus total folder build lama, JANGAN cuma cache
rm -rf .next

# build ulang dari source code yang sekarang
npm run build

# baru copy static & public ke standalone, dari hasil build yang BARU ini
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# restart PM2 total (delete+start lebih aman daripada restart biasa)
pm2 delete arvemart
pm2 start .next/standalone/server.js --name arvemart
pm2 save


```

Atau jalankan script deploy:

```bash
chmod +x "langkah kalau pakai standalone.md"
./langkah\ kalau\ pakai\ standalone.md
```

### Cek log frontend:
```bash
pm2 logs arvemart --lines 30 --nostream
```

---

## 5. Verifikasi

| URL | Harusnya |
|-----|----------|
| `https://arvemart.com` | Next.js home page |
| `https://api.arvemart.com` | `404 page not found` (karena ga ada root route, itu normal) |
| `https://api.arvemart.com/api/categories` | JSON response categories |
| `https://arvemart.com/login` | Halaman login |

---

## 6. Yang WAJIB dilakukan sebelum production

### 6.1 Ganti secret keys
Di `api-arveshop-go/.env.production`:
```
SECRET_JWT=hasil_dari_openssl_rand_-hex_32
SECRET_KEY=hasil_dari_openssl_rand_-hex_32
```
Generate: `openssl rand -hex 32`

### 6.2 Ganti credentials production
- **Digiflazz**: ganti `DIGIFLAZZ_USERNAME` & `DIGIFLAZZ_PROD_KEY` ke production (bukan `dev-*`)
- **iPaymu**: ganti `IPAYMU_VA` & `IPAYMU_API_KEY` ke production (bukan `SANDBOX-*`)
- **Cloudinary**: ganti ke akun production jika perlu

### 6.3 Update cookie domain
Pastikan `.env.production`:
```
APP_ENV=production
COOKIE_DOMAIN=.arvemart.com
```

### 6.4 Database production
Ganti password MySQL di `docker-compose.yml`:
```yaml
MYSQL_ROOT_PASSWORD: pilih_password_kuat
MYSQL_PASSWORD: pilih_password_kuat
```

Dan update `DB_PASS` di `.env.production`.

---

## 7. Troubleshooting

**Login tidak bekerja:**
- Pastikan `COOKIE_DOMAIN=.arvemart.com` di backend `.env`
- Pastikan `APP_ENV=production` (agar cookie pake Secure flag)
- Pastikan frontend akses `https://api.arvemart.com/api/me` (bukan `/api/auth/me`)

**CORS error di browser:**
- Cek `main.go` baris 26-36 — domain sudah terdaftar
- Pastikan nginx proxy backend udah bener

**WebSocket tidak connect:**
- Pastikan nginx punya proxy untuk `/ws` dan `/socket.io/`
- Cek config frontend.md

**Banner kepotong/jelek:**
- Banner sekarang otomatis di-crop Cloudinary ke 16:9
- Upload banner dengan rasio mendekati 16:9 untuk hasil terbaik

**Redis error:**
- Backend tetap jalan walau Redis mati (hanya refresh token & job queue yang terpengaruh)

---

## 8. Struktur File Penting

```
arvemart/
├── api-arveshop-go/
│   ├── .env.production      ← Config production (backend)
│   ├── docker-compose.yml   ← Backend + MySQL + Redis
│   └── Dockerfile           ← Build Go API
├── arveshop/
│   ├── .env.production      ← Config production (frontend)
│   ├── next.config.ts       ← Rewrite /api/* ke api.arvemart.com
│   ├── config frontend.md   ← Nginx config untuk arvemart.com
│   ├── langkah kalau pakai standalone.md ← Deploy script PM2
│   └── storage/app/wa-engine/ ← WA Engine
└── cara deploy.md           ← File ini
```
