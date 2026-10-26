# CareFlow — Deployment, GitHub & Production Hosting Guide

This guide explains how to push your CareFlow codebase to GitHub, host it publicly for free with SSL, and manage the secure Admin Console.

---

## 1. Push Code to Your GitHub Repository

If you haven't connected your local repository to GitHub yet, follow these 3 quick steps:

### Step 1: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Name the repository (e.g. `careflow` or `careflow-platform`).
3. Choose **Public** or **Private**, and click **Create repository** (do **not** check "Initialize with README", as we already have code).

### Step 2: Push Local Code to GitHub
Run the following commands in your terminal from `/home/avantik/Documents/hacathon1`:

```bash
# Add your GitHub remote repository (replace with your actual GitHub username & repo name)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/careflow.git

# Ensure the main branch is active
git branch -M main

# Stage and commit any latest changes
git add .
git commit -m "feat: complete CareFlow platform with secure admin console, docker, and deployment configs"

# Push code to GitHub
git push -u origin main
```

---

## 2. Deploy & Host Publicly (Free Options)

### Option A: Vercel (Frontend) + Render (Backend) — *Recommended & 100% Free*

This gives you a blazingly fast public URL for your judges and users (e.g. `https://careflow-health.vercel.app`).

#### 1. Host the Backend on Render (Free)
1. Go to [render.com](https://render.com) and sign up / log in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your `careflow` GitHub repository.
4. Configure:
   - **Root Directory:** Leave empty (root)
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**. 
6. Render will give you a public URL like: `https://careflow-api.onrender.com`.

#### 2. Host the Frontend on Vercel (Free)
1. Go to [vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import your `careflow` GitHub repository.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://careflow-api.onrender.com/api/v1` (your Render backend URL)
6. Click **Deploy**.
7. In ~60 seconds, your site is live with global CDN and free HTTPS!

---

### Option B: 1-Command Docker Compose (VPS, Railway, or Local Production)

We have included a production [`docker-compose.yml`](./docker-compose.yml), [`backend/Dockerfile`](./backend/Dockerfile), and [`frontend/Dockerfile`](./frontend/Dockerfile).

To run the full stack anywhere with Docker:

```bash
# Build and run all services in background
docker compose up --build -d

# Check running status
docker compose ps

# View live logs
docker compose logs -f
```

---

## 3. Secure Admin Console & Access Control

### Security Barrier (`only admin can enter`)
- The Admin Console is located at: **`/admin`**.
- If an unauthenticated user or patient attempts to access `/admin`, they are greeted with an **Access Restricted** barrier.
- **Admin Authentication Options:**
  1. **Master Password / PIN:** Enter `password123` or PIN `1234`.
  2. **1-Click Judge Authenticate:** Click the *"1-Click Authenticate as Super Admin"* button.
  3. **Role-Based Check:** Users logged in as `superadmin@careflow.com` or `admin@citycare.com` bypass the gate automatically.
- **Lock Session:** Click the red Logout icon in the top right of the Admin Console anytime to lock access.

### Full Administrative Powers
Once inside `/admin`, administrators have complete operational control:
1. **Live Queue Simulator:** Click *"Advance Queue by 1 Step"* to deterministic step through tokens and broadcast live turn calls.
2. **Hospital Network:** Click *"Add Hospital"* to onboard new hospitals and medical centers with OPD departments.
3. **Doctor Roster:** Click *"Add Doctor"* to onboard and verify clinicians with OPD room allocations and fees.
4. **User Access Management:** View all patients and staff; change or elevate any user's role with one dropdown click.
5. **Broadcast Announcements:** Broadcast emergency alerts, triage notices, or OPD delays to all connected browser screens over WebSockets.
6. **Feature Flags:** Toggle AI Clinical Scribe, Smart Waiting Time Engine, and ABDM Consent Gate in real time.

---

## 4. Making the Platform Upgradable & Updateable

CareFlow is engineered with modular layers so you can add features at any time:

1. **Database Schema Evolution:**
   - Database models reside in `backend/app/models/`.
   - SQLite (`careflow.db`) is used for rapid hackathon iteration, with zero-code migration compatibility for PostgreSQL in production (just set `DATABASE_URL=postgresql+asyncpg://...`).
2. **Dynamic Configuration:**
   - Feature flags and system settings are live toggles inside the Admin Console and do not require server redeployment.
3. **API Extensibility:**
   - New endpoints are organized modularly in `backend/app/api/v1/endpoints/`.
