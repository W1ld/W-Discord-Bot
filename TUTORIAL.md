# 🤖 W-DiscBot Setup Tutorial (TypeScript Edition)

This is the setup guide for your Discord bot using **TypeScript**. This version is the professional standard, more stable, and safer from runtime errors.

## 🛠 Prerequisites

Ensure the following are ready on your computer (or provided by your hosting):
1. **Node.js (v18 and above)**: [Download here](https://nodejs.org/)
2. **FFmpeg**: Required for audio processing.
3. **yt-dlp**: Required to fetch audio from YouTube.
   - *Note: Most bot hosting provides FFmpeg and yt-dlp by default.*

---

## 🔑 Getting API Keys

### 1. Discord Bot Token
1. Open [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a **New Application**.
3. Go to the **Bot** tab, click **Reset Token**, and copy the token.
4. Enable **Privileged Gateway Intents**:
   - **Presence Intent** (ON)
   - **Server Members Intent** (ON)
   - **Message Content Intent** (ON)

### 2. Google Gemini API Key
1. Open [Google AI Studio](https://aistudio.google.com/).
2. Create a new API Key.

---

## 💻 How to Run Locally

1. **Environment Configuration**:
   - Copy `.env.example` to `.env`.
   - Fill in `DISCORD_TOKEN` and `GEMINI_API_KEY`.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Bot (Dev Mode)**:
   ```bash
   npm run dev
   ```

---

## 🌐 How to Host on bot-hosting.net (Pterodactyl)

1. **Upload Files**:
   Upload the `src` folder, `package.json`, `tsconfig.json`, and `.env`.
   *Do not upload `node_modules` or `dist`.*
2. **Choose Language**:
   Select **Node.js**.
3. **Startup Command**:
   Use this command so the bot automatically compiles on startup:
   ```bash
   npm install && npm run build && npm run start
   ```
   *Or if your panel supports `tsx`, you can use: `npx tsx src/index.ts`*

---

## ✨ Special Features (Interactive UI)

This bot uses TypeScript with features like:
- **"Now Playing" Embed**: Elegant display of title, duration, and volume.
- **Volume Buttons (➕ / ➖)**: Change volume directly from chat without message spam.
- **Gemini AI**: Smart chatting with the latest model.

---

## 🎮 Command List (Slash Commands)

- `/play [url]` - Play YouTube video/playlist.
- `/chat [message]` - Talk to Gemini AI.
- `/help` - Show this help menu.
- `/skip` - Skip the current song.
- `/queue` - View the song queue.
- `/stop` - Stop & clear the queue.
- `/join` / `/leave` - Join or leave the voice channel.
