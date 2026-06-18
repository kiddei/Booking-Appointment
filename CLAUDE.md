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
- Admin:  `admin` / `admin1234` — logs in at `/admin/login`
- Player: `player1` / `player1234` — logs in at `/login`

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
│   │   ├── pages/             HomePage, LoginPage, AdminLoginPage, RegisterPage,
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
    │   ├── mail/              MailModule — @Global(); MailService (nodemailer)
    │   │   ├── mail.service.ts       sendBookingConfirmation(); graceful SMTP failure logging
    │   │   └── mail.module.ts        @Global() — no explicit import needed in BookingsModule
    │   └── admin/             AdminModule — /api/admin (ADMIN only)
    │       ├── admin.service.ts      All admin business logic; scoped to admin's owned courts
    │       └── admin.controller.ts   Thin HTTP layer; passes @CurrentUser() to every service call
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
- **Court ownership:** Admin service methods check `court.createdByAdminId === adminId`; throws `ForbiddenException` on mismatch. Enforced in service layer — even direct API calls are blocked.
- **Password fields** are never returned from services — use `select` to exclude `passwordHash`.
- **Disabled users** (`User.active = false`) are rejected at login with a clear error message.
- **Frontend role check:** `ProtectedRoute` checks `user.role === 'ADMIN'` (not `'ROLE_ADMIN'`).
- **Separate login portals:** `/login` for players, `/admin/login` for admins; `AdminLoginPage` rejects non-admin roles after successful auth and immediately logs them out. `ProtectedRoute adminOnly` redirects unauthenticated users to `/admin/login` (not `/login`).
- **Email failures are non-fatal:** try/catch wraps mail send in `BookingsService.create()`; booking succeeds even if SMTP is misconfigured.

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
| PATCH  | `/api/bookings/{id}/receipt` | User | Upload payment receipt (base64) |
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
| GET    | `/api/admin/bookings/pending` | Admin | Pending bookings awaiting payment review |
| PATCH  | `/api/admin/bookings/{id}/confirm` | Admin | Confirm a pending booking |
| PATCH  | `/api/admin/bookings/{id}/cancel` | Admin | Cancel any booking |

### React / Frontend
- Auth state lives in `AuthContext` — `login()`, `logout()`, `register()`, `user`, `loading`.
- All API calls go through `src/api/client.js` (Axios, `withCredentials: true`).
- Login sends JSON `{ username, password }` — no FormData.
- Protected routes wrap children in `<ProtectedRoute>` or `<ProtectedRoute adminOnly>`.
- `ProtectedRoute adminOnly` redirects unauthenticated users to `/admin/login`; regular routes redirect to `/login`.
- `/auth/login` redirects to `/login` (backward compat via React Router `<Navigate>`).
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
- **Booking flow:** 4-step progressive disclosure — (1) select location + date, (2) `PlayableCourtGrid` appears, (3) `TimeSlotPicker` appears once a court is chosen, (4) after "Confirm Booking" succeeds, a payment section (GCash QR + receipt upload) appears inline on the same page as Step 4; `courtNumber` is required in `POST /bookings`; a single receipt upload applies to all courts booked via `Promise.allSettled` over each booking ID
- **Payment flow:** New bookings default to `PENDING`; after booking creation user stays on BookingPage for inline GCash QR + receipt upload (Step 4); "Pay later" navigates to dashboard; after receipt upload shows "Under Review" on BookingDetailPage; admin confirms via Payments tab card → status → `CONFIRMED`
- **Court operating hours:** `Court.openTime` and `Court.closeTime` (stored as `"HH:00"` strings, e.g. `"07:00"` / `"22:00"`); required fields in court creation; control both the `TimeSlotPicker` slot range (via `openHour`/`closeHour` props) and the admin calendar row range; defaults: `07:00` / `22:00`
- **Multi-court booking grouping:** When a user books N courts in one session (same `courtId`, `bookingDate`, `startTime`, `endTime`), the Dashboard shows them as a single expandable row; expanding reveals individual sub-rows (`.booking-sub-row`) for each court with court number, date, time, and per-court amount — clearly justifying the combined total; Cancel cancels all IDs via `Promise.allSettled`; "Pay Now" links to the primary booking's detail page; clicking a sub-row navigates to that specific booking's detail
- **Admin Payments tab:** Card-based layout (`.payment-cards` grid, `.payment-card-admin`) — not a table; multi-court sessions grouped into one card (same grouping key as dashboard); "Confirm All (N)" / "Cancel All" calls `Promise.allSettled` over all booking IDs in the group; receipt opens in a modal overlay
- **Admin Bookings tab:** Today's Schedule calendar above the table — also fetches `/admin/courts` to know `totalCourts`/`openTime`/`closeTime` per location; if 2+ active courts exist shows a location-picker card grid first (`.location-selector`); once a location is selected the calendar uses a CSS grid layout where **columns = playable court numbers** and **rows = hourly time slots (court's openTime → closeTime)**; booking chips appear only in the start-hour row, subsequent hours show a tinted cell (`.cal-cell--covered`); clicking a chip opens the detail modal with Confirm/Cancel actions
- **Conflict detection:** blocks both `PENDING` and `CONFIRMED` bookings to prevent double-booking before payment

---

## Database

| Environment | Database               | Schema management               |
|-------------|------------------------|---------------------------------|
| dev         | PostgreSQL (Docker)    | `npm run db:migrate` in `backend/` |
| prod        | PostgreSQL             | `prisma migrate deploy`         |

**Models:**
- `User`: `id`, `username`, `email`, `passwordHash`, `role (PLAYER|ADMIN)`, `active`, `createdAt`
- `Court`: `id`, `name`, `description`, `location`, `ownerName`, `contactNumber`, `gcashQrCode`, `indoor`, `totalCourts`, `maxPlayers`, `hourlyRate`, `openTime`, `closeTime`, `active`, `createdByAdminId Int?`, `createdAt`
- `Booking`: `id`, `userId`, `courtId`, `courtNumber`, `startTime`, `endTime`, `status (PENDING|CONFIRMED|CANCELLED)`, `paymentReceipt String?`, `createdAt`

**Relations:** `User` 1→N `Booking`, `User` 1→N `Court` (via `AdminCourts` relation), `Court` 1→N `Booking`

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

- [x] Email confirmation on booking — `MailService` (nodemailer); HTML template with neon dark theme; graceful SMTP failure
- [ ] Payment integration (Stripe Checkout)
- [x] Court availability time slot picker (custom, per-day view)
- [x] Playable court selection grid (SVG top-down cards, Available/Busy/Full, per-court booking)
- [ ] Court availability full calendar view (FullCalendar, multi-day)
- [x] Admin court management — add, edit, deactivate, reactivate
- [x] Admin user management — role toggle (PLAYER ↔ ADMIN), enable/disable accounts
- [x] Admin booking management — view all, cancel any booking
- [x] Admin overview stats — courts, users, bookings, revenue
- [x] Admin Payments tab — card-based layout with receipt thumbnail and confirm/cancel actions; multi-court sessions grouped into one card with "Confirm All"
- [x] Admin Bookings tab — Today's Schedule calendar (columns = courts, rows = hourly slots per court's openTime→closeTime, location-picker for multi-location admins, clickable chips, detail modal)
- [x] Inline payment flow — Step 4 on BookingPage (GCash QR + receipt upload without leaving the page)
- [x] Dashboard multi-court grouping — same-session bookings shown as one expandable row; sub-rows show individual courts with per-court amounts; Cancel cancels all courts in session
- [x] Court operating hours — openTime/closeTime fields on every court (required on creation); drive TimeSlotPicker range and admin calendar row range
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

| Variable        | Description                                           |
|-----------------|-------------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string                          |
| `JWT_SECRET`    | Long random string for signing JWTs                   |
| `JWT_EXPIRY`    | Token lifetime, e.g. `7d` (default)                   |
| `NODE_ENV`      | Set to `production`                                   |
| `PORT`          | HTTP port (default 8080)                              |
| `SMTP_HOST`     | SMTP server hostname (leave empty to disable email)   |
| `SMTP_PORT`     | SMTP port (default 587)                               |
| `SMTP_SECURE`   | `true` for port 465, `false` for STARTTLS             |
| `SMTP_USER`     | SMTP auth username                                    |
| `SMTP_PASS`     | SMTP auth password / app password                     |
| `SMTP_FROM`     | Sender display name + address                         |
| `APP_URL`       | Frontend public URL — used in email "View Booking" links |

---

- **Separate login portals:** `/login` (players) and `/admin/login` (admins); `AdminLoginPage` validates role post-login and logs out non-admins; `ProtectedRoute adminOnly` redirects to `/admin/login`; `/auth/login` redirects to `/login` for backward compat
- **Court ownership:** `Court.createdByAdminId` links each court to its creating admin; all admin mutations check ownership in service layer (ForbiddenException on mismatch); stats, bookings, and calendar are scoped to admin's own courts; frontend shows "VIEW ONLY" badge and hides action buttons for courts owned by other admins
- **Email on booking:** `MailService` sends HTML confirmation email after `BookingsService.create()`; SMTP configured via env vars; email failures are non-fatal and logged; template matches dark neon brand; reusable for future email types via `sendMail()` private method

*Last updated: 2026-06-18 (r9)*
