# PicklePro Courts — CLAUDE.md
> Ongoing development guide for the Pickleball Court Booking System.
> Update this file whenever the architecture, conventions, or roadmap changes.

---

## Project Overview

A **NestJS 10 / TypeScript** REST API backend with a **React 18 / Vite** SPA frontend.
Designed for commercial SaaS use and mobile-first.

**Architecture:** React SPA ↔ NestJS REST API (JWT in httpOnly cookie auth)

**Dev servers:** `npm run dev` from the repo root (starts both with `concurrently`)
- Backend:  `http://localhost:8080`
- Frontend: `http://localhost:5173`
- Vite proxies `/api/*` to port 8080 automatically in dev mode

**Database (dev):** PostgreSQL 16 via Docker Compose — `docker compose up -d`

**Dev seed users:**
- Admin:  `admin` / `admin1234`
- Player: `player1` / `player1234`

---

## Repository Layout

```
Booking-Appointment/
├── docker-compose.yml         PostgreSQL for dev
├── package.json               Root — concurrently scripts
│
├── frontend/                  React + Vite SPA
│   ├── public/images/         paddle.png, ball.png
│   ├── src/
│   │   ├── api/client.js      Axios instance (withCredentials, error unwrap)
│   │   ├── context/AuthContext.jsx
│   │   ├── components/        Navbar, Footer, ProtectedRoute, DatePicker, TimeSlotPicker
│   │   ├── pages/             HomePage, LoginPage, RegisterPage,
│   │   │                      CourtsPage, DashboardPage, BookingPage,
│   │   │                      BookingDetailPage, AdminPage
│   │   ├── App.jsx            Routes + AuthProvider
│   │   ├── main.jsx
│   │   └── index.css          All styles (dark theme, design tokens)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── backend/                   NestJS REST API
    ├── prisma/
    │   ├── schema.prisma      Prisma schema (User, Court, Booking)
    │   ├── migrations/        Auto-generated migration history
    │   └── seed.ts            Dev seed (admin + player1 + 3 courts)
    ├── src/
    │   ├── main.ts            Bootstrap (cookieParser, CORS, ValidationPipe)
    │   ├── app.module.ts      Root module
    │   ├── prisma/            PrismaService (global)
    │   ├── auth/              AuthModule
    │   │   ├── auth.service.ts       login() — checks user.active, register()
    │   │   ├── auth.controller.ts    /api/auth/*
    │   │   ├── strategies/jwt.strategy.ts   cookie-based JWT extraction
    │   │   ├── guards/        JwtAuthGuard, RolesGuard
    │   │   └── decorators/    @CurrentUser, @Roles
    │   ├── courts/            CourtsModule — /api/courts (public read)
    │   │   └── dto/           create-court.dto.ts, update-court.dto.ts
    │   ├── bookings/          BookingsModule — /api/bookings
    │   └── admin/             AdminModule — /api/admin (ADMIN only)
    │       ├── admin.service.ts      All admin business logic (courts, users, bookings, stats)
    │       └── admin.controller.ts   Thin HTTP layer only
    ├── .env                   Local env (git-ignored)
    ├── .env.example           Template
    ├── package.json
    ├── tsconfig.json
    └── nest-cli.json
```

---

## Key Conventions

### NestJS / TypeScript
- **Constructor injection** — no property injection. NestJS DI handles it automatically.
- Business rules live in **services only** — controllers only orchestrate HTTP I/O.
- **DTOs** use `class-validator` decorators; `ValidationPipe` with `whitelist: true` strips unknown fields.
- Passwords **always** hashed with `bcrypt` (cost 10).
- Prisma is a `@Global()` module — inject `PrismaService` directly without importing `PrismaModule` locally.
- Use `async/await` throughout; no `.then()` chains in service/controller code.

### Security
- **Auth:** JWT signed with `JWT_SECRET`, stored in an `httpOnly`, `SameSite=Lax` cookie (`access_token`).
- **CSRF:** Not required — `httpOnly` + `SameSite=Lax` cookie + JSON-only API prevents CSRF attacks.
- **CORS:** `http://localhost:5173` allowed in dev (`main.ts`); disabled in production (same-origin).
- **Role enforcement:** `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ADMIN')` at controller class level.
- **Password fields** are never returned from services — use `select` to exclude `passwordHash`.
- **Disabled users** (`User.active = false`) are rejected at login with a clear error message.
- **Frontend role check:** `ProtectedRoute` checks `user.role === 'ADMIN'` (not `'ROLE_ADMIN'`).

### REST API Contract
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | `/api/auth/login`      | Public | JSON `{username, password}` → sets cookie |
| POST   | `/api/auth/register`   | Public | Create account |
| GET    | `/api/auth/me`         | Any    | Current user from JWT |
| POST   | `/api/auth/logout`     | Any    | Clear cookie |
| GET    | `/api/courts`          | Public | List active courts |
| GET    | `/api/courts/{id}`     | Public | Single court |
| GET    | `/api/courts/{id}/availability?date=YYYY-MM-DD&courtNumber=N` | Public | Booked slots for specific playable court on a date |
| GET    | `/api/courts/{id}/courts-status?date=YYYY-MM-DD` | Public | Per-playable-court booking density for a date |
| GET    | `/api/bookings`        | User   | My bookings |
| POST   | `/api/bookings`        | User   | Create booking |
| GET    | `/api/bookings/{id}`   | User   | Booking detail |
| DELETE | `/api/bookings/{id}/cancel` | User | Cancel booking |
| GET    | `/api/admin/stats`            | Admin | Overview counts + revenue |
| GET    | `/api/admin/courts`           | Admin | All courts (active + inactive) |
| POST   | `/api/admin/courts`           | Admin | Add court |
| PATCH  | `/api/admin/courts/{id}`      | Admin | Update court details |
| PATCH  | `/api/admin/courts/{id}/deactivate` | Admin | Deactivate court |
| PATCH  | `/api/admin/courts/{id}/reactivate` | Admin | Reactivate court |
| GET    | `/api/admin/users`            | Admin | All users |
| PATCH  | `/api/admin/users/{id}/role`  | Admin | Change role (PLAYER ↔ ADMIN) |
| PATCH  | `/api/admin/users/{id}/disable` | Admin | Disable user account |
| PATCH  | `/api/admin/users/{id}/enable`  | Admin | Enable user account |
| GET    | `/api/admin/bookings`         | Admin | All bookings |
| PATCH  | `/api/admin/bookings/{id}/cancel` | Admin | Cancel any booking |

### React / Frontend
- Auth state lives in `AuthContext` — `login()`, `logout()`, `register()`, `user`, `loading`.
- All API calls go through `src/api/client.js` (Axios, `withCredentials: true`).
- Login sends JSON `{ username, password }` — no FormData.
- Protected routes wrap children in `<ProtectedRoute>` or `<ProtectedRoute adminOnly>`.
- CSS design tokens live in `:root` in `index.css` — change colors there, not inline.

### CSS / Design
- **Color palette:** `--neon: #c8ff00`, `--bg: #0a0a0a`, `--surface: #111`
- **Fonts:** `Bebas Neue` (hero display), `Inter` (all body) — loaded in `index.html`
- Mobile breakpoints: `900px` (layout), `768px` (nav collapses to hamburger), `640px` (phone)
- Avoid adding new utility classes; extend existing component-scoped selectors
- **Currency:** Philippine Peso `₱` — used everywhere rates and totals are displayed
- **Court type selector:** uses a two-button segment control (`.court-type-toggle`) — not a checkbox; buttons toggle `form.indoor` directly
- **GCash QR:** stored as base64 `TEXT` in `Court.gcashQrCode`; backend body limit raised to 5 MB in `main.ts`; UI shows a dashed dropzone with a `+` circle when empty, and a 120×120 preview with Replace/Remove when set
- **Phone input:** `.phone-input` is always full-width (not inside a `form-row`) so the flag select and number field have adequate space
- **Playable courts:** `Court.totalCourts` controls how many individual courts (1–20) are under a location; `Booking.courtNumber` records which one was booked; conflict check scopes to `(courtId, courtNumber)` pair; `PlayableCourtGrid` renders SVG top-down court cards with Available/Busy/Full indicators
- **Booking flow:** 3-step progressive disclosure — (1) select location + date, (2) `PlayableCourtGrid` appears, (3) `TimeSlotPicker` appears once a court is chosen; `courtNumber` is required in `POST /bookings`

---

## Database

| Environment | Database               | Schema management               |
|-------------|------------------------|---------------------------------|
| dev         | PostgreSQL (Docker)    | `npm run db:migrate` in `backend/` |
| prod        | PostgreSQL             | `prisma migrate deploy`         |

**Models:**
- `User`: `id`, `username`, `email`, `passwordHash`, `role (PLAYER|ADMIN)`, `active`, `createdAt`
- `Court`: `id`, `name`, `description`, `location`, `ownerName`, `contactNumber`, `gcashQrCode`, `indoor`, `totalCourts`, `maxPlayers`, `hourlyRate`, `active`, `createdAt`
- `Booking`: `id`, `userId`, `courtId`, `courtNumber`, `startTime`, `endTime`, `status (CONFIRMED|CANCELLED)`, `createdAt`

**Relations:** `User` 1→N `Booking`, `Court` 1→N `Booking`

**Notes:**
- Conflict detection: `bookings.service.ts` — overlapping time range query on `CONFIRMED` bookings
- Schema changes: edit `prisma/schema.prisma`, then run `npm run db:migrate` from `backend/`
- **View live data:** run `npx prisma studio` from `backend/` — opens a browser UI at http://localhost:5555

---

## How to Run (Dev)

```powershell
# First time only
docker compose up -d          # start PostgreSQL
npm install                   # installs concurrently at root
npm run setup                 # installs backend + frontend deps, migrates + seeds DB

# Every subsequent run — one command starts both servers
npm run dev
```

Open **http://localhost:5173** in the browser.

---

## Production Build

**Backend:**
```powershell
cd backend
npm run build
node dist/main
```

**Frontend:**
```powershell
cd frontend
npm run build
# dist/ contains the SPA — serve with nginx or a static host
```

For a single-server deployment, configure NestJS to serve the React `dist/` folder as static files via `@nestjs/serve-static`.

---

## How to Add a Feature

### New React page
1. Create `frontend/src/pages/NewPage.jsx`
2. Add `<Route>` in `App.jsx` (wrap with `<ProtectedRoute>` if auth-required)
3. Add a nav link in `Navbar.jsx` if globally visible

### New API endpoint
1. Add method to the appropriate service in `backend/src/<module>/`
2. Add the corresponding controller method + route decorator
3. Add the call in the React page via `client.get/post/delete()`
4. If a new role permission is needed, add `@Roles(...)` to the controller

### New entity
1. Add the model to `backend/prisma/schema.prisma`
2. Run `npm run db:migrate` from `backend/`
3. Create `<entity>.service.ts` for business logic
4. Expose via a controller; never call `PrismaService` from controllers directly

---

## Planned Features (Backlog)

- [ ] Email confirmation on booking (Nodemailer / SendGrid)
- [ ] Payment integration (Stripe Checkout)
- [x] Court availability time slot picker (custom, per-day view)
- [x] Playable court selection grid (SVG top-down cards, Available/Busy/Full, per-court booking)
- [ ] Court availability full calendar view (FullCalendar, multi-day)
- [x] Admin court management — add, edit, deactivate, reactivate
- [x] Admin user management — role toggle (PLAYER ↔ ADMIN), enable/disable accounts
- [x] Admin booking management — view all, cancel any booking
- [x] Admin overview stats — courts, users, bookings, revenue
- [ ] Admin booking reschedule (move booking to a new time slot)
- [ ] Waitlist / notification when cancelled slot opens
- [ ] User profile & password change page
- [ ] Recurring weekly bookings
- [ ] Docker Compose deployment config (full-stack)
- [ ] Swagger/OpenAPI docs (`@nestjs/swagger`)
- [ ] Refresh token rotation

---

## Testing

- Unit tests: `backend/src/**/*.spec.ts`
- Use `@nestjs/testing` + `TestingModule` — mock `PrismaService` with Jest
- Integration tests: spin up a real DB via Docker in CI
- Run: `npm test` from `backend/`

---

## Environment Variables (Production)

| Variable        | Description                                  |
|-----------------|----------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string                 |
| `JWT_SECRET`    | Long random string for signing JWTs          |
| `JWT_EXPIRY`    | Token lifetime, e.g. `7d` (default)          |
| `NODE_ENV`      | Set to `production`                          |
| `PORT`          | HTTP port (default 8080)                     |

---

*Last updated: 2026-05-07 (r4)*
