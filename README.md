# PicklePro Courts — Booking System

Smart pickleball court reservation system.
**Backend:** NestJS 10 / TypeScript REST API
**Frontend:** React 18 + Vite SPA
**Database:** PostgreSQL 16 (via Docker)

---

## Before You Start — Required Tools

You need two things installed: **Node.js** and **Docker Desktop**.

```powershell
node -version    # must show 18+
docker -version  # must show 20+
```

---

## Step 1 — Install Node.js

1. Go to **https://nodejs.org** and download the **LTS** version
2. Run the installer — keep all defaults
3. Reopen PowerShell and verify:
   ```powershell
   node -version   # e.g. v20.11.0
   npm -version    # e.g. 10.2.4
   ```

---

## Step 2 — Install Docker Desktop

Docker lets you run PostgreSQL as a container — no manual database installation needed.

1. Go to **https://www.docker.com/products/docker-desktop**
2. Click **"Download for Windows"**
3. Run the installer — keep all defaults. It will ask to enable WSL 2; click **OK**
4. After install, **restart your computer** when prompted
5. Open **Docker Desktop** from the Start menu and wait until you see **"Engine running"** in the bottom-left corner (green dot)
6. Verify in PowerShell:
   ```powershell
   docker -version         # e.g. Docker version 25.0.3
   docker compose version  # e.g. Docker Compose version v2.24.5
   ```

> **What is Docker?** Docker runs software in isolated containers. Here we use it to run PostgreSQL without installing it directly on your machine. The database data is saved in a named volume so it survives restarts.

---

## Step 3 — Start PostgreSQL

From the project root:

```powershell
docker compose up -d
```

This downloads the PostgreSQL 16 image (first time only, ~100 MB) and starts the container in the background.

Verify it's running:
```powershell
docker compose ps
```

You should see `postgres` with status `Up` (healthy).

> **Stop the database** (keeps data): `docker compose down`
> **Wipe and start fresh**: `docker compose down -v`

---

## Step 4 — First-Time Setup

Run this once from the project root:

```powershell
npm install       # installs concurrently
npm run setup     # copies .env, installs all deps, creates DB tables, seeds test accounts
```

> `npm run setup` automatically copies `backend/.env.example` → `backend/.env` if it doesn't exist yet. The default dev values work out of the box with the Docker PostgreSQL container.

---

## Step 5 — Start the App

```powershell
npm run dev
```

This starts both servers at once:
- Backend API → http://localhost:8080
- Frontend → **http://localhost:5173** ← open this in your browser

---

## Test Accounts

| Role   | Username  | Password     |
|--------|-----------|--------------|
| Admin  | `admin`   | `admin1234`  |
| Player | `player1` | `player1234` |

---

## Daily Workflow

```powershell
# Start Docker Desktop (if not already running), then:
docker compose up -d    # start the database
npm run dev             # start backend + frontend
```

When you're done:
```powershell
# Ctrl+C to stop the dev servers, then:
docker compose down     # stop the database (data is saved)
```

---

## Reset the Database

```powershell
cd backend
npm run db:reset    # wipes all data and re-seeds test accounts
```

---

## View Database Data

Use **Prisma Studio** — a browser-based GUI that lets you browse and edit all tables without a separate database tool:

```powershell
cd backend
npx prisma studio
```

Opens at **http://localhost:5555**. You'll see the `User`, `Court`, and `Booking` tables with full read/write access.

> Alternatively connect any PostgreSQL client (TablePlus, DBeaver, pgAdmin) to `localhost:5432`, database `pickleballdb`, using the credentials in `backend/.env`.

---

## Production Build

**Backend:**
```powershell
cd backend
npm run build
node dist/main
```

Set these environment variables before deploying (see `backend/.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — long random string (keep this secret)
- `NODE_ENV=production`

**Frontend:**
```powershell
cd frontend
npm run build
# Outputs to frontend/dist/ — serve with nginx or any static host
```

---

## Common Errors

**`npm: command not found`**
> Install Node.js from https://nodejs.org (LTS), then reopen PowerShell.

**`docker: command not found`**
> Install Docker Desktop and make sure it's running (green dot in the taskbar tray).

**`Error: connect ECONNREFUSED 127.0.0.1:5432`**
> PostgreSQL is not running. Run `docker compose up -d` first.

**`docker compose up` hangs or fails**
> Open Docker Desktop and make sure the engine is running (green dot, bottom-left).
> If you just installed it, try restarting your computer.

**`Port 8080 already in use`**
```powershell
netstat -ano | findstr :8080
taskkill /PID <PID-from-above> /F
```

**`Cannot find module '@prisma/client'`**
> Run `npm run setup` from the project root.
