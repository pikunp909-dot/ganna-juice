# Kunal's Ganna Juice — Platform

Premium cinematic website + secure owner dashboard.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| API | Express (Node) | light, runs on Termux |
| DB | SQLite via `node:sqlite` | zero native deps on Android; SQL ports to Postgres |
| Web | Vite + React + Tailwind + Framer Motion | (Step 4+) |

## Server

```
cd server
npm install
cp .env.example .env   # set a strong JWT_SECRET
npm run seed            # admin + settings + menu
npm start               # http://localhost:4000
```

Default admin: `kunal@ganna.in` / `kunal123` (change after first login via `/api/auth/change-password`).

## API

### Auth
| Method | Route | Body | Notes |
|---|---|---|---|
| POST | /api/auth/login | email, password | rate-limited 10/15min, generic errors |
| GET | /api/auth/me | — | Bearer token → current admin |
| POST | /api/auth/change-password | currentPassword, newPassword (≥8) | protected |
| POST | /api/auth/logout | — | client discards token |

All dashboard routes require `Authorization: Bearer <jwt>`:
`/api/menu/admin`, `POST/PUT/PATCH/DELETE /api/menu/...`,
`GET /api/orders`, `PATCH /api/orders/:id/verify`,
`GET/PUT /api/settings`, `POST /api/upload`.

### Public
- `GET /api/menu` — full menu
- `GET /api/settings/public` — phone, whatsapp, instagram, telegram, locationUrl, upiId, heroImageUrl
- `POST /api/orders` — create order (server-computed totals)
- `POST /api/auth/login`

## Security notes
- bcrypt (12 rounds), timing-parity dummy hash for unknown emails
- JWT HS256, 12h expiry, verified on every protected route
- rate limit on login, generic error messages, no user enumeration
- uploads restricted to images (8MB), stored under `server/uploads/`
