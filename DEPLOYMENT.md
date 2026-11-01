# Deployment Guide — Ganna Plate

Production runbook for hosting the owner dashboard + customer site.

## Architecture

```
Browser ──▶ Vite SPA (web/ → dist/)
                │
                └─▶ Express API (server/ :4000)
                         ├── SQLite database (server/data/ganna.db)
                         ├── Uploads (server/uploads/)
                         └── Public routes: /api/*, /uploads/*
```

- **Backend**: Node 20+ (tested on Node 24), Express, `node:sqlite` (zero native deps).
- **Frontend**: Vite + React SPA. In production the built `web/dist` is served by the same Express process (or by nginx/Caddy).
- **Database**: SQLite — a single file. No separate DB server needed. Ports to Postgres later if you outgrow it.

---

## 1. Prerequisites

- Node.js 20+ (Node 24 recommended).
- `npm` (v10+).
- A domain (optional but recommended for HTTPS).

---

## 2. Environment configuration

Copy the example and set real values (the current `.env` already has a strong random `JWT_SECRET`):

```bash
cd server
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | API port (default `4000`) |
| `JWT_SECRET` | **yes** | 64-char random string. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — rotate before launch |
| `CORS_ORIGINS` | yes | Comma-separated frontend origins, e.g. `https://ganna.example.com` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Default admin for `npm run seed` |
| `WHATSAPP_API_TOKEN` / `WHATSAPP_PHONE_ID` | no | Leave empty unless integrating WhatsApp Business API; `wa.me` links are used otherwise |
| `MEDIA_STORAGE` | no | `local` (default) stores uploads under `server/uploads/` |

### Seed / reset the database

```bash
cd server
npm run seed     # creates admin + settings + sample menu (only if empty)
```

---

## 3. Build the frontend

From the repo root:

```bash
cd web
npm ci
npm run build    # outputs to web/dist
```

---

## 4. Serve the production app

### Option A — Express serves everything (simplest, works on Render/Railway/VPS)

This is **already built in** to `server/src/index.js`: when `web/dist` exists, Express serves it as static assets and falls back to `index.html` for any non-API route (so react-router deep links work). No code changes needed.

Full build-and-start from the repo root:

```bash
# 1. Install + build the frontend (outputs to web/dist)
cd web && npm ci && npm run build

# 2. Install server deps and start (serves API + web/dist on :4000)
cd ../server && npm ci && node src/index.js
```

The app is now live at `http://<host>:4000` — one process, two jobs.

> Important: after any frontend change, re-run `npm run build` in `web/` so the served `dist` reflects it.

### Option B — nginx / Caddy in front (recommended for a VPS)

Build as above, then run only the API on a private port and let the web server handle the SPA:

```nginx
# /etc/nginx/sites-available/ganna
server {
    listen 80;
    server_name ganna.example.com;

    # SPA static files
    root /var/www/ganna/web/dist;
    index index.html;

    client_max_body_size 12M;   # uploads up to 8MB + multipart overhead

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;   # SPA fallback
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ganna /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Add HTTPS with `certbot --nginx` (Let's Encrypt) or Caddy (auto-TLS).

---

## 5. Platform-specific notes

### Render (Web Service)

- **Build command**: `cd web && npm ci && npm run build && cd ../server && npm ci`
- **Start command**: `cd server && node src/index.js`
- **Environment**: set `JWT_SECRET`, `CORS_ORIGINS=https://<your-service>.onrender.com`.
- **Persistence**: add a **Disk** to the service and mount it; it lands at `/opt/render/project/src/server/data` (project root). SQLite must live on the disk — keep `server/data/` inside the mount. Uploads (`server/uploads/`) should also live on the disk if you want images to survive deploys.
- Only one instance should run (SQLite is single-writer friendly; more instances need a shared volume or a DB upgrade).

### Railway

- App root: repo root. Use `railway up` or GitHub integration.
- Add a **Volume** mounted at a path like `/app/server/data` (and `/app/server/uploads` for media). Set `DATA_DIR`/upload path accordingly if you move them.
- **Build**: `cd web && npm ci && npm run build && cd ../server && npm ci`
- **Start**: `cd server && node src/index.js`
- **Environment**: same `JWT_SECRET`, `CORS_ORIGINS` as above. Set a custom domain in the Railway dashboard for HTTPS.

### VPS (Ubuntu/Debian)

1. `git clone` the repo to `/opt/ganna`, then build the frontend (section 3).
2. Install Node 24 (NodeSource or nvm).
3. Add a `systemd` unit:

```ini
# /etc/systemd/system/ganna.service
[Unit]
Description=Ganna Plate API
After=network.target

[Service]
WorkingDirectory=/opt/ganna/server
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ganna
sudo systemctl status ganna
```

4. Put nginx in front (Option B) and enable HTTPS.

---

## 6. SQLite operations

- **Default location**: `server/data/ganna.db` (+ `-wal`, `-shm`).
- **Backup** (safe while running):

```bash
cd server
node -e "const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync('data/ganna.db'); d.exec('PRAGMA wal_checkpoint(TRUNCATE)'); d.close();"
cp data/ganna.db backups/ganna-$(date +%F).db
```

- **Exit**: `node src/index.js` → `Ctrl+C` → file is consistent.

---

## 7. Security checklist (before going live)

- [ ] `JWT_SECRET` is a fresh random 64-char string, not the repo default.
- [ ] Default admin password changed: login → `POST /api/auth/change-password` (or edit via seed).
- [ ] `CORS_ORIGINS` lists only your real frontend origin(s).
- [ ] HTTPS enabled everywhere; no mixed content (all images via relative `/uploads/...` paths, same origin).
- [ ] Uploads restricted to images (`< 8MB`) — enforced by multer, keep it that way.
- [ ] SQLite + uploads on a persistent volume (Render/Railway) or regular VPS backups.
- [ ] Rate limiting: login is rate-limited (10/15 min). Add a reverse-proxy rate limit on `/api/upload` if abuse appears.

---

## 8. Go-live smoke test

1. Open the customer site — hero, menu, cart, checkout, QR, WhatsApp receipt all work.
2. Place a real order → appears as Pending in the admin dashboard.
3. Verify with a UTR → revenue updates on Analytics.
4. Upload a menu image and a hero image → visible on the customer site.
5. Confirm `GET /api/health` returns `{"ok":true}`.

---

## 9. Known limits

- **SQLite** suits a single-instance deployment. For horizontal scale, swap `server/src/db.js` for a Postgres client (same exported helpers: `run`, `all`, `get`) — the SQL in the routes is already Postgres-compatible.
- **Local media** (`MEDIA_STORAGE=local`) is file-system based. For serverless/ephemeral filesystems, replace the upload route with Cloudinary/S3 and set the returned public URL.
