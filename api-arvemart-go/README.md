<!-- install gorm dan driver mysql -->

go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql

<!-- air untuk reload go -->

go install github.com/air-verse/air@v1.40.0

go install github.com/air-verse/air@latest <!--go versi terbaru 1.25 -->

go get github.com/gin-contrib/cors <!-- untuk bisa diakses lainnya -->

go get github.com/cloudinary/cloudinary-go/v2 <!-- untuk install cloudinary -->

<!-- Tambahkan ini di next.config.ts supaya akses ke url cloudinary bisa -->

images: {
remotePatterns: [
{
protocol: "https",
hostname: "res.cloudinary.com",
port: "",
pathname: "/**",
},
],
dangerouslyAllowSVG: true,
contentDispositionType: "attachment",
contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
formats: ["image/avif", "image/webp"],
},

<!-- queue pakai redis -->

sudo apt update
sudo apt install redis-server

# Jalankan Redis

sudo systemctl start redis-server
sudo systemctl enable redis-server



--------------------------------------------------
CARA SWITCH PAYMENT GATEWAY (IPAYMU <-> MIDTRANS)
--------------------------------------------------

Saat ini aktif: IPAYMU.
Untuk ganti ke MIDTRANS, lakukan:

--- 1. routes/routes.go ---
- Baris 39:   ganti `controllers.CreateTransactionIpaymu` → `controllers.CreateTransactionMidtrans`
- Baris 52:   uncomment `r.POST("/api/webhook/midtrans", ...)` dan comment `r.POST("/api/webhook/ipaymu", ...)`

--- 2. models/Transaction.go ---
- Comment semua field `Ipaymu*` (baris ~96-103)
- Uncomment semua field `Midtrans*` (baris ~89-97)

--- 3. .env ---
- Comment IPAYMU_VA dan IPAYMU_API_KEY
- Uncomment MIDTRANS_MERCHANT_ID, MIDTRANS_CLIENT_KEY, MIDTRANS_SERVER_KEY

--- 4. controllers/ipaymu_controller.go ---
Tidak perlu diubah (tidak dipanggil jika route sudah diganti)

--- 5. Frontend ---
Saat pakai iPaymu, history page menggunakan field `ipaymu_*`.
Saat pakai Midtrans, history page akan menggunakan field `midtrans_*`.
Sesuaikan di: `arveshop/app/(user)/history/[orderid]/page.jsx`
Ganti `ipaymu_` → `midtrans_` (atau `duitku_` seperti sebelumnya)

--------------------------------------------------
CATATAN IPAYMU
--------------------------------------------------
- Daftar di https://ipaymu.com
- Ambil VA dan API Key dari dashboard
- Webhook callback: POST /api/webhook/ipaymu
- Callback dari iPaymu akan dikirim ke APP_URL/api/webhook/ipaymu
- Status: "berhasil" -> settlement, "pending" -> pending, lainnya -> failure
