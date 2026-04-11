# 🎵 W-DiscBot (TypeScript Edition)

Sebuah bot Discord serbaguna yang dibangun dengan **TypeScript** dan **Discord.js v14**. Bot ini menggabungkan fitur hiburan musik berkualitas tinggi, kecerdasan buatan (Gemini AI), dan fitur kapsul waktu berbasis database.

## ✨ Fitur Utama

-   **🎶 Musik Premium**:
    -   Streaming dari YouTube dengan kualitas tinggi.
    -   Kontrol interaktif melalui tombol (Volume, Skip, Stop, Pause/Resume).
    -   Optimasi CPU rendah (WebM Opus) untuk mencegah audio putus-putus.
-   **🤖 AI Integration**:
    -   Berbincang dengan **Google Gemini AI** langsung di Discord menggunakan `/chat`.
-   **⏳ Server Time Capsule (Memento)**:
    -   Simpan pesan untuk diri sendiri di masa depan.
    -   Terintegrasi dengan database MySQL untuk penyimpanan permanen.
-   **⚙️ Arsitektur Modern**:
    -   Full TypeScript untuk kode yang lebih aman dan terstruktur.
    -   Sistem command dinamis (Auto-deploy Slash Commands).

## 🚀 Persyaratan Sistem

-   **Node.js** v16.11.0 atau lebih baru.
-   **FFmpeg** terinstall di sistem (atau via package).
-   **Database MySQL** (Rekomendasi: bot-hosting.net).
-   **Google Gemini API Key**.

## 🛠️ Instalasi

1. Clone repository ini:
```bash
git clone https://github.com/username/W-DiscBot.git
cd W-DiscBot
```

2. Install dependensi:
```bash
npm install
```

3. Konfigurasi Environment Variables:
Buat file `.env` di root directory dan isi sebagai berikut:
```env
DISCORD_TOKEN="TOKEN_BOT_KAMU"
GEMINI_API_KEY="API_KEY_GEMINI_KAMU"

# Database Configuration (bot-hosting.net)
DB_HOST="mysql.db.bot-hosting.net"
DB_PORT=3306
DB_USER="username_db"
DB_PASS="password_db"
DB_NAME="nama_db"
```

4. Jalankan bot:
```bash
# Mode Development (Auto-reload)
npm run dev

# Build ke JavaScript
npm run build

# Jalankan Production
npm run start
```

## 📜 Daftar Perintah (Slash Commands)

| Kategori | Perintah | Deskripsi |
| :--- | :--- | :--- |
| **Musik** | `/play [url/judul]` | Memutar musik dari YouTube |
| | `/skip` | Melewati lagu yang sedang diputar |
| | `/queue` | Melihat daftar antrean lagu |
| | `/stop` | Menghentikan musik dan keluar |
| | `/join` | Bot masuk ke Voice Channel |
| **AI** | `/chat [pesan]` | Tanya apa saja ke Gemini AI |
| **Lainnya** | `/memento [pesan] [durasi]` | Simpan pesan kapsul waktu (e.g. 1m, 1h, 1d) |
| | `/help` | Menampilkan menu bantuan |

## 🛡️ License
Proyek ini dibuat untuk tujuan pembelajaran dan penggunaan pribadi.

---
**Made with ❤️ by [W1ld]**
