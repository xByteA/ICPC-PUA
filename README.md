# PUA ICPC Community

A responsive events and training platform for the PUA ICPC community. The project is split into a React/Vite frontend and an Express/Mongoose REST API.

The Stitch reference requires a Google sign-in and could not be viewed from this workspace. The first implementation follows the requested visual direction (warm cream, cyan/purple/yellow/pink accents, bold type, black outlines and simple shadows); exported reference images can be used to refine it.

## Requirements

- Node.js 20 or later
- MongoDB 6 or later, local or hosted

## Start locally

Open two terminals in VS Code, with the project folder as the workspace.

1. In **Terminal 1**, configure and start the API:

   ```powershell
   cd .\Backend
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   ```

   Open `Backend/.env` and replace `JWT_SECRET` with a random value of at least 32 characters. Ensure MongoDB is running and `MONGODB_URI` points to it, then run:

   ```powershell
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:5000`. Check `http://localhost:5000/api/health`.

2. In **Terminal 2**, start the frontend:

   ```powershell
   cd .\Frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Set `VITE_API_URL` in `Frontend/.env` if the API is hosted elsewhere.

4. Create a user account in the frontend, then grant it admin access from `Backend`:

   ```powershell
   npm run make-admin -- user@example.com
   ```

   Sign out and back in to refresh the account role. Admins can create and publish events, set an optional registration deadline and attendance points, generate or replace an event QR code, review attendance, and delete events after typing the exact event name. Check-in opens at the event start and closes at the event end. Deletion archives the event and disables its QR while retaining attendance and awarded-points history.

## Environment variables

| Variable | Application | Description |
| --- | --- | --- |
| `PORT` | Backend | API port (default `5000`) |
| `MONGODB_URI` | Backend | MongoDB connection URI |
| `JWT_SECRET` | Backend | Secret used to sign seven-day bearer tokens; at least 32 characters |
| `CLIENT_ORIGIN` | Backend | Allowed browser origin (default `http://localhost:5173`) |
| `VITE_API_URL` | Frontend | API base URL (default `http://localhost:5000/api`) |

## API overview

All routes are prefixed by `/api`; protected routes use `Authorization: Bearer <token>`.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create a user account |
| `POST` | `/auth/login` | Public | Sign in |
| `GET` | `/auth/me` | User | Get the current account |
| `PUT` | `/auth/student-id` | User | Set a missing student ID once |
| `PUT` | `/auth/password` | User | Change password after verifying the current password |
| `GET` | `/events` | Public | List published upcoming events |
| `GET` | `/events?status=past&q=...&category=...` | Public | Search/filter published past events |
| `GET` | `/events/:id-or-slug` | Public | Get a published event |
| `POST` | `/events/:id/registrations` | User | Register; offline registrations get an opaque ticket ID |
| `DELETE` | `/events/:id/registrations` | User | Cancel a future event registration |
| `GET` | `/events/my` | User | List the current user's registrations |
| `GET` | `/events/leaderboard` | Public | Rank members by verified attendance points (top 100) |
| `GET` | `/events/leaderboard/me` | User | Get personal rank, total, and verified attendance history |
| `GET` | `/events/:userId/profile` | Public | View a member's public profile, rank, points, and attendance history |
| `GET` | `/events/:id/check-in?token=...` | User | Verify the event QR and the user's registration; return attendance status |
| `POST` | `/events/:id/check-in` | User | Record attendance once during the configured event window |
| `GET` | `/admin/events` | Admin | List all events |
| `POST` | `/admin/events` | Admin | Create a draft or published event |
| `PUT` | `/admin/events/:id` | Admin | Edit an event |
| `POST` | `/admin/events/:id/check-in-qr` | Admin | Generate a rotatable, opaque QR code for the published event |
| `GET` | `/admin/events/:id/registrations` | Admin | View event attendees |

Responses use JSON; errors have the shape `{ "error": { "message": "..." } }`. New accounts must provide a unique 4–20 digit student ID; existing accounts without one can set it once in Settings. The academic year shown in Settings is derived from the ID's first four digits. Student IDs are returned only by authenticated account endpoints, not public member profiles or the leaderboard. MongoDB unique indexes prevent duplicate account and event registrations. Each event QR contains a random token; only its SHA-256 hash is stored by the API. Regenerating the QR invalidates the previous code. Check-in opens at the event start and closes at the event end; the admin dashboard does not expose custom check-in window fields. Registration deadlines are optional. Attendance points default to `0`. An atomic update records the registered student's attendance and snapshots the points awarded on that registration record; the unique student/event registration is the auditable reward transaction and prevents duplicate awards, including concurrent requests. Later event point changes apply only to future check-ins and do not rewrite historical awards. The leaderboard derives totals only from verified student attendance records and uses dense ranking by total points (equal point totals share a rank); within a tie, display order is attendance count, name, then user ID. Logout clears the stateless JWT from the browser; it expires after seven days.

## Tests and production build

```powershell
cd Backend
npm test
```

```powershell
cd Frontend
npm run build
```
