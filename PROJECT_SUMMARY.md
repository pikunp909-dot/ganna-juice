# 🥤 Sugarcane Juice Store - Project Documentation

> Single home for everything needed to run, deploy, and hand over the
> Kunal Juice Store platform. Customer website + owner dashboard are one
> codebase, deployed as a single Express process on Render.

---

## 🌐 1. Live Links

- **Customer Website:** https://ganna-juice.onrender.com
- **Admin Dashboard:** https://ganna-juice.onrender.com/admin
- **API Health Check:** https://ganna-juice.onrender.com/api/health

The customer site and the admin dashboard share one URL — the admin panel
lives under `/admin` and is protected by login.

---

## 🔑 2. Login Credentials

- **Email:** kunal@ganna.in
- **Password:** kunal123
- *(Note: Login karte hi Settings mein jaa kar password change karein).*

Password change is available in **Settings → Change Password** (old password
required). The login endpoint is rate-limited to 10 attempts / 15 minutes.

---

## 🛠️ 3. Tech Stack & Current Setup

- **Frontend:** React.js (Vite) + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express
- **Database:** SQLite (Local file `server/data/ganna.db`) — via built-in `node:sqlite`, zero native dependencies
- **Image Uploads:** Local folder (`server/uploads`)
- **Hosting:** Render (Free Tier)
- **PWA:** Yes (Separate apps for Customer and Admin)
- **Auth:** JWT (12h expiry) + bcrypt password hashing
- **Push:** Web Push (VAPID) — `web-push` package

---

## 🔐 4. Environment Variables (Render Settings)

Currently, only these are needed on Render:

- `JWT_SECRET` = GannaSuperSecretKey123!@#
- `NODE_ENV` = production
*(Cloudinary aur Supabase are not used currently to keep the system simple).*

Optional (leave unset unless needed):

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `4000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (default `http://localhost:5173`) |
| `WHATSAPP_API_TOKEN` | WhatsApp Business API token — **if left empty, `wa.me` links are used instead** |
| `WHATSAPP_PHONE_ID` | WhatsApp Business phone ID — only used with the API token |
| `MEDIA_STORAGE` | `local` (default) — uploads stored in `server/uploads/` |

> ⚠️ **Security:** `GannaSuperSecretKey123!@#` is a shared default. Rotate
> it to a long random string before going production: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## 📱 5. Features List

1. **Bilingual:** Odia & English language toggle (customer site).
2. **Cart & Checkout:** UPI (QR scan + UTR) and Cash on Delivery (COD).
3. **WhatsApp Auto-Receipt:** Order place hote hi automatic WhatsApp bill khulta hai — a pre-filled `wa.me` message opens with the full itemized bill (WhatsApp Business API is optional).
4. **Push Notifications:** Admin gets new order alerts; Customers get village broadcast alerts.
5. **Admin Dashboard:** Analytics, Orders, Menu, Reviews, Settings.
6. **Customer Reviews:** 5-star rating system.

Additional details:

- **Menu management** — add/edit/delete items, set availability, prices, images.
- **Order flow** — new order → admin push alert → verify UTR (payment verified) → status tracking.
- **Analytics** — today/month revenue, UPI vs COD split, custom date range, last-7-days chart.
- **Customer install as separate PWAs** — `/` installs "Sugarcane Juice" (juice glass icon), `/admin` installs "Admin App" (chart icon).

---

## 🚀 6. How to Run Locally (Termux/PC)

```bash
# 1. Build frontend
cd web && npm install && npm run build

# 2. Start server
cd ../server && npm install && node src/index.js
```

For development (hot reload + Vite proxy to API):

```bash
# Terminal 1 — API (auto-restarts on change)
cd server && npm run dev

# Terminal 2 — frontend dev server (http://localhost:5173)
cd web && npm run dev
```

Seed the database (creates admin user, settings, and sample menu — only if empty):

```bash
cd server && npm run seed
```

---

## 🗂️ 7. Project Structure

```
ganna-platform/
├── web/                         # Frontend (React + Vite SPA)
│   ├── public/
│   │   ├── manifest.json        # Customer PWA manifest ("Sugarcane Juice")
│   │   ├── admin-manifest.json  # Admin PWA manifest ("Admin App")
│   │   ├── icons/
│   │   │   ├── customer/        # Juice glass icon (192/512)
│   │   │   └── admin/           # Chart icon (192/512)
│   │   └── sw.js                # Service worker (shell cache + push)
│   ├── src/
│   │   ├── App.jsx              # Routes + dynamic manifest swapping
│   │   ├── main.jsx             # Entry (router, providers, SW registration)
│   │   ├── api.js               # Fetch wrapper with JWT
│   │   ├── auth.jsx             # Auth context + ProtectedRoute
│   │   ├── cart.jsx             # Cart context
│   │   ├── language.jsx / locales.js   # Odia/English i18n
│   │   ├── layouts/DashboardLayout.jsx # Admin shell (sidebar, push prompt)
│   │   ├── pages/               # Home, Login, Analytics, Menu, Orders,
│   │   │                        #   Settings, AdminReviews
│   │   └── components/          # Checkout, ui, etc.
│   ├── index.html
│   └── vite.config.js
│
├── server/                      # Backend (Express API)
│   ├── src/
│   │   ├── index.js             # Express app, mounts routes
│   │   ├── db.js                # node:sqlite wrapper + schema init
│   │   ├── push.js              # VAPID web push helpers
│   │   ├── middleware/requireAdmin.js
│   │   └── routes/
│   │       ├── auth.js          # login, me, change-password
│   │       ├── menu.js
│   │       ├── orders.js        # create, list, stats, verify, delete
│   │       ├── reviews.js
│   │       ├── settings.js
│   │       ├── upload.js
│   │       └── notifications.js # vapid, subscribe(-customer), broadcast, test
│   ├── data/ganna.db            # SQLite database file
│   ├── uploads/                 # Local image storage
│   ├── scripts/seed.js          # DB seeder
│   └── .env
└── PROJECT_SUMMARY.md
```

---

## 🔌 8. API Reference

Base URL: `https://ganna-juice.onrender.com/api` (or `http://localhost:4000/api` locally).
Admin routes require `Authorization: Bearer <JWT>`.

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public (rate-limited) | Login → JWT |
| GET | `/auth/me` | admin | Current admin from token |
| POST | `/auth/change-password` | admin | Change password (old required) |
| GET | `/menu` | public | Available menu items |
| POST | `/menu` | admin | Create menu item |
| PATCH | `/menu/:id` | admin | Update item (price, availability…) |
| DELETE | `/menu/:id` | admin | Delete item |
| POST | `/orders` | public | Create order (total recomputed server-side) |
| GET | `/orders` | admin | All orders + items |
| GET | `/orders/stats` | admin | Revenue rollups + last-7-days |
| PATCH | `/orders/:id/verify` | admin | Mark payment verified (UTR required) |
| DELETE | `/orders/:id` | admin | Delete order |
| GET | `/reviews` | public | All reviews |
| POST | `/reviews` | public | Leave a review |
| GET | `/settings` | public | Contact info, UPI id, location |
| PUT | `/settings` | admin | Update settings |
| POST | `/upload` | admin | Upload image |
| GET | `/notifications/vapid` | public | VAPID public key |
| POST | `/notifications/subscribe` | admin | Save admin push subscription |
| POST | `/notifications/subscribe-customer` | public | Save customer push subscription |
| POST | `/notifications/broadcast` | admin | Push to all customer subscriptions |
| POST | `/notifications/test` | admin | Send test push to admin |

---

## 🗄️ 9. Database Schema (SQLite)

| Table | Purpose | Key columns |
|---|---|---|
| `AdminUsers` | Owner accounts | email (unique), password (bcrypt), role |
| `Settings` | Single-row site config | phone, whatsapp, upiId, qrCodeUrl, locationUrl, heroImageUrl… |
| `Menu` | Menu items | name, price, imageUrl, isAvailable |
| `Orders` | Orders | customerName, customerPhone, totalAmount, paymentMethod, utrNumber, status |
| `OrderItems` | Line items | orderId → Orders, menuItemId, quantity, price |
| `Reviews` | Customer reviews | customerName, rating, comment |
| `Subscriptions` | Push subscriptions | endpoint (unique), keysJson, type (`admin`/`customer`) |

---

## 📲 10. PWA — Two Separate Installable Apps

| | Customer | Admin |
|---|---|---|
| **Manifest** | `/manifest.json` | `/admin-manifest.json` |
| **Name** | Sugarcane Juice | Kunal Juice Admin |
| **Short name** | Sugarcane | Admin App |
| **Icon** | Juice glass (`/icons/customer/`) | Chart (`/icons/admin/`) |
| **Start URL** | `/` | `/admin` |

The `usePwaManifest()` hook in `web/src/App.jsx` swaps `<link rel="manifest">`
and the iOS `apple-touch-icon` based on the route — `/admin` and `/login`
use the admin manifest, everything else uses the customer manifest.

> ⚠️ **Redeploy note:** already-installed PWAs keep their original name/icon.
> After deploying, uninstall both old apps on the phone and reinstall from
> `/` (customer) and `/admin` (admin).

---

## 🚢 11. Deployment Runbook (Render)

This is a single-process deploy — the built frontend is served by the same
Express app.

1. **Build web:** `cd web && npm install && npm run build`
   (produces `web/dist/` — the server serves it automatically if present).
2. **Build server:** `cd server && npm install` (Node 20+, tested on 24).
3. **On Render:** create a Web Service from the repo.
   - Root directory: repo root (or `server/` with the frontend pre-built / build step).
   - Build command: `cd web && npm ci && npm run build && cd ../server && npm ci`
   - Start command: `cd server && node src/index.js`
   - Env vars: `JWT_SECRET`, `NODE_ENV=production` (+ optional WhatsApp/Media vars).
4. **First boot:** the schema auto-creates on start. Run the seed once if the
   admin account does not exist: `cd server && npm run seed`.
5. **Disk note:** Render's free tier has ephemeral/ephemeral-disk storage —
   `ganna.db` and `uploads/` live on the instance disk. They persist for the
   life of the instance but are lost on redeploy/restart cycles unless you add
   a persistent disk or backup `server/data/ganna.db` and `server/uploads/`.

---

## 🛟 12. Troubleshooting

| Symptom | Fix |
|---|---|
| `JWT_SECRET` warning at startup | Set a strong random value in `.env` / Render env vars |
| Login fails | Confirm admin exists (`npm run seed`), check email case, wait out the 15-min rate limit |
| Push notifications don't arrive | On `/admin`, click **Enable Notifications**; reinstall the PWA if old (subscriptions must be re-registered after reinstall) |
| New order, no admin alert | Ensure admin subscription exists in `Subscriptions` with `type='admin'` |
| Images broken | Check `server/uploads/` exists and `MEDIA_STORAGE=local` |
| `npm run build` errors | Run from `web/`; `npm ci` first to sync lockfile |
| Database reset | Stop server, delete `server/data/ganna.db`, run `npm run seed` (destructive) |

---

## ✅ 13. Handover Checklist

- [ ] Verify live customer site loads and ordering works (UPI + COD).
- [ ] Verify admin login at `/admin`, password changed from default.
- [ ] Verify admin push notifications receive a test ping (`POST /notifications/test`).
- [ ] Verify a test broadcast reaches a customer subscription.
- [ ] Reinstall both PWAs on the owner's phone (uninstall old first).
- [ ] Confirm the WhatsApp number in Settings opens a correct `wa.me` bill.
- [ ] Back up `server/data/ganna.db` + `server/uploads/` before any redeploy.
- [ ] Rotate `JWT_SECRET` if still the shared default.
- [ ] Share this file with the new maintainer.

---

*Generated for handover — Kunal Juice Store. Last updated: 2026-11-02.*
