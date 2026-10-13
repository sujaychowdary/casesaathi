# CaseSaathi AI — Deployment Guide & Live URLs

CaseSaathi AI has been transitioned into a **full-stack web application** (FastAPI backend + responsive web UI) with zero dependency on Streamlit.

---

## 🌐 Live URLs (Active Right Now)

### 1. 🌍 Public Web URL (Accessible Worldwide)
- **Public URL**: **[http://bore.pub:40861](http://bore.pub:40861)**
- Anyone on any device, phone, or computer anywhere in the world can open this link right now!

### 2. 💻 Local Machine URL
- **Local URL**: **[http://localhost:8000](http://localhost:8000)**
- Open directly in your browser on this machine.

### 3. 📱 Wi-Fi / LAN Network URL
- **Network URL**: `http://10.80.8.135:8000`
- Open on any phone or laptop connected to the same Wi-Fi.

---

## 🚀 One-Click Permanent Cloud Hosting (Render / Railway)

If you'd like a permanent `.onrender.com` or custom domain URL:

### Option 1: Render.com (100% Free)
1. Push your code to GitHub.
2. Sign in to [render.com](https://render.com) and click **"New +"** &rarr; **"Web Service"**.
3. Select this repository.
4. Render automatically reads [`render.yaml`](file:///c:/Users/NANI/OneDrive/Desktop/casesaathi/render.yaml):
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add your `GEMINI_API_KEY` in Environment Variables.
6. Click **Deploy** to receive your permanent `https://casesaathi-ai.onrender.com` link.

### Option 2: Railway.app
1. Go to [railway.app](https://railway.app) and select **"Deploy from GitHub"**.
2. Railway will automatically build using the included [`Dockerfile`](file:///c:/Users/NANI/OneDrive/Desktop/casesaathi/Dockerfile) or [`Procfile`](file:///c:/Users/NANI/OneDrive/Desktop/casesaathi/Procfile).
3. Click **"Generate Domain"** under Settings &rarr; Networking to get your public URL.

---

## ⚡ How to Start the App Anytime

Simply double-click [`start.bat`](file:///c:/Users/NANI/OneDrive/Desktop/casesaathi/start.bat) in the project folder, or run:

```powershell
.\start.bat
```
