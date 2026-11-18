# Task Management System

A full-stack task manager. Users register, sign in and manage their own tasks: create, edit, complete, search, filter, paginate, move to trash, restore and permanently delete. A dashboard shows task statistics and a feed of recently completed tasks.

- **Backend:** Express 5 REST API with Prisma 7 and MySQL 8. Authentication uses server-side sessions stored in MySQL, sent as an HttpOnly cookie, with CSRF protection.
- **Frontend:** React 19 single-page app built with Vite, Tailwind CSS, TanStack Query and React Hook Form.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Technology stack](#2-technology-stack)
3. [Architecture overview](#3-architecture-overview)
4. [Repository structure](#4-repository-structure)
5. [Prerequisites](#5-prerequisites)
6. [Installation](#6-installation)
7. [Environment configuration](#7-environment-configuration)
8. [MySQL database setup](#8-mysql-database-setup)
9. [Prisma migration commands](#9-prisma-migration-commands)
10. [Database seeding](#10-database-seeding)
11. [Running the backend](#11-running-the-backend)
12. [Running the frontend](#12-running-the-frontend)
13. [Running tests](#13-running-tests)
14. [Building for production](#14-building-for-production)
15. [API endpoints](#15-api-endpoints)
16. [Authentication and sessions](#16-authentication-and-sessions)
17. [Architectural decisions](#17-architectural-decisions)
18. [Step 3: Public API integration (Weather)](#step-3-public-api-integration-weather)

---

## 1. Project overview

| Feature    | Details                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accounts   | Register, log in, log out, "who am I". Passwords are hashed with bcrypt.                                                                               |
| Tasks      | Create, view, replace (PUT), partially update (PATCH), toggle completion.                                                                              |
| Listing    | Title search, a status filter (`all`, `pending`, `completed`), pagination, newest first.                                                               |
| Trash      | Soft delete, a trash listing, restore, and permanent delete (trashed tasks only).                                                                      |
| Statistics | Total, completed and pending counts for active tasks, plus a separate trashed count. All are aggregated in SQL.                                        |
| Activity   | A `TaskCompleted` event is recorded by a listener in `task_activities`. Recent activity is shown on the dashboard.                                     |
| Weather    | Current weather for any city from the public Open-Meteo API, fetched by the backend. See [Step 3](#step-3-public-api-integration-weather).             |
| Security   | Ownership enforced on every query, CSRF tokens, rate-limited login and register, Helmet headers, a consistent error envelope with no internal details. |
| UI         | Responsive layout with a mobile drawer. Loading, empty, error and success (toast) states. Accessible modals and forms.                                 |

## 2. Technology stack

| Layer    | Technology                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Runtime  | Node.js ≥ 20.19, TypeScript 5.9 (ES modules throughout)                                                                   |
| API      | Express 5, Zod 4 validation, Helmet, CORS, express-rate-limit                                                             |
| Auth     | express-session with the express-mysql-session store, bcryptjs, csrf-sync (synchronizer token)                            |
| Database | MySQL 8, Prisma 7 ORM (driver adapter `@prisma/adapter-mariadb`)                                                          |
| Frontend | React 19, Vite 8, React Router 8, TanStack Query 5, React Hook Form 7 with Zod, Axios, Tailwind CSS 4, lucide-react icons |
| Testing  | Vitest 5. Supertest against a real MySQL test database for the backend. Testing Library with jsdom for the frontend.      |
| Quality  | ESLint 10 with typescript-eslint (plus react-hooks and react-refresh on the frontend), Prettier 3                         |

## 3. Architecture overview

```
Browser (React SPA, :5173)
   │  same-origin /api requests in dev (Vite proxy), cookie + X-CSRF-Token header
   ▼
Express API (:3000)
   helmet → cors → json(100kb) → session (MySQL store) → CSRF check
   → routes → validate(zod) → authenticate → controller → service → Prisma
   → notFound → errorHandler (single response envelope)
   │                                   │
   │                                   └─ eventBus.emit('task.completed') ─▶ listener → task_activities
   ▼
MySQL 8: users · tasks · task_activities · sessions
```

### Backend layers

| Layer           | Responsibility                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routes**      | Declare the URL, the middleware chain and the handler. Static paths (`/statistics`, `/trash`) are registered before `/:id`.                                                                                                                                                             |
| **Middleware**  | `validate(schema)` parses `body`, `query` and `params` with Zod and stores the typed result on `req.validated`. On failure it returns a 422 with per-field messages. `authenticate` loads the session user or returns 401. The error handler maps every error to the response envelope. |
| **Controllers** | Thin handlers: read the validated input, call the service, send the response.                                                                                                                                                                                                           |
| **Services**    | Business rules and all Prisma access. Every task query goes through `findOwnedTask(userId, id, scope)` or a `where: { userId }` filter. There is no unscoped query.                                                                                                                     |
| **Events**      | A small typed in-process event bus. `TaskCompleted` is emitted by the task service after the update commits. A listener writes the activity row.                                                                                                                                        |

### Frontend layers

| Layer                   | Responsibility                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **services/**           | The Axios instance (cookies, CSRF header, one retry on a stale token, global 401 handling) and one typed function per endpoint.                        |
| **hooks/**              | TanStack Query hooks. The `['auth','me']` query _is_ the auth state, so there is no separate store. Mutations invalidate the task and activity caches. |
| **pages/, components/** | Pages compose presentational components. Filters and the page number live in the URL, so back/forward and refresh work.                                |
| **schemas/**            | Zod schemas shared by React Hook Form. Server 422 errors are mapped back onto the matching form fields.                                                |

## 4. Repository structure

```
.
├── package.json              # root scripts (lint/test/build both apps) + Prettier
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # User, Task, TaskActivity, Session
│   │   ├── migrations/       # SQL migrations (committed)
│   │   └── seed.ts           # development data
│   ├── prisma.config.ts      # Prisma 7 config (schema, migrations, seed, datasource)
│   ├── src/
│   │   ├── config/           # env (zod-validated), database, session
│   │   ├── middleware/       # validate, authenticate, csrf, error-handler, not-found
│   │   ├── modules/
│   │   │   ├── auth/         # routes, controller, service, session helpers, validation
│   │   │   ├── tasks/        # routes, controller, service, validation, types
│   │   │   ├── activities/   # recent activity endpoint + service
│   │   │   └── weather/      # Open-Meteo integration: routes, controller, service, validation
│   │   ├── events/           # event bus, TaskCompleted event, listener
│   │   ├── utils/            # AppError, response helpers, shared validators
│   │   ├── app.ts            # createApp(): builds the Express app (used by tests)
│   │   └── server.ts         # listen + graceful shutdown
│   ├── tests/                # Vitest + Supertest integration tests
│   ├── scripts/vitest.mjs    # Windows drive-letter workaround for Vitest
│   ├── .env.example
│   └── .env.test             # test settings (no secrets; points at *_test DB)
└── frontend/
    ├── src/
    │   ├── components/       # common/ (Button, Modal, Toast…), layout/, tasks/, weather/
    │   ├── hooks/            # useAuth, useTasks, useTaskFilters, useToast, useWeather…
    │   ├── pages/            # Login, Register, Dashboard, TaskDetail, Trash, Weather, NotFound
    │   ├── routes/           # AppRoutes with ProtectedRoute / GuestRoute guards
    │   ├── services/         # api.ts (Axios), authService, taskService, weatherService
    │   ├── schemas/          # Zod form schemas
    │   ├── types/, utils/, lib/
    │   └── test/             # test setup + render helpers
    ├── vite.config.ts        # dev proxy, vendor chunking, test config
    └── .env.example
```

## 5. Prerequisites

- **Node.js 20.19 or newer.** Developed on Node 24; npm 10 or newer.
- **MySQL 8.0 or newer.** Developed on MySQL 8.4. A local install, Laragon, XAMPP or Docker all work.
- A MySQL user that can create databases. Prisma also needs this for its shadow database when you run `migrate dev`.

## 6. Installation

```bash
git clone <repository-url> task-management
cd task-management

# Installs root tooling (Prettier) and both apps. The backend's postinstall runs `prisma generate`.
npm run install:all
```

Each app can also be installed on its own: `cd backend && npm install`, and the same for `frontend`.

## 7. Environment configuration

Copy the example files and adjust them:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### `backend/.env`

| Variable                | Default / example                              | Purpose                                                                                                                 |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `development`                                  | `development`, `test` or `production`.                                                                                  |
| `PORT`                  | `3000`                                         | API port.                                                                                                               |
| `DATABASE_URL`          | `mysql://root:@127.0.0.1:3306/task_management` | MySQL connection string. Used by Prisma, the app and the session store.                                                 |
| `FRONTEND_ORIGIN`       | `http://localhost:5173`                        | Allowed CORS origins (comma-separated). Credentials are allowed only for these origins.                                 |
| `SESSION_SECRET`        | _(required, ≥ 32 chars)_                       | Signs the session cookie. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `SESSION_COOKIE_SECURE` | `false`                                        | Set to `true` when served over HTTPS. Required in production.                                                           |
| `SESSION_MAX_AGE_HOURS` | `24`                                           | Session and cookie lifetime.                                                                                            |
| `TRUST_PROXY`           | `false`                                        | Set to `true` behind a TLS-terminating reverse proxy. Needed for secure cookies there.                                  |
| `BCRYPT_ROUNDS`         | `12`                                           | Password hashing cost (4–15).                                                                                           |

The environment is validated with Zod at startup. If it's invalid, the process prints each problem and exits instead of starting half-configured.

### `frontend/.env`

| Variable                | Default                 | Purpose                                                                                                   |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `/api`                  | Base URL for API calls. The default goes through the Vite dev proxy, so the browser sees a single origin. |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Where the Vite dev server forwards `/api` requests.                                                       |

`backend/.env.test` is committed on purpose. It has no real secrets, points at `task_management_test`, and uses `BCRYPT_ROUNDS=4` to keep tests fast. Real `.env` files are git-ignored.

## 8. MySQL database setup

Create the development and test databases:

```sql
CREATE DATABASE task_management      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE task_management_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

If you use a dedicated MySQL user instead of `root`, grant it full rights on both databases and put its credentials in `DATABASE_URL`. If you'll run `prisma migrate dev`, it also needs `CREATE` rights for Prisma's temporary shadow database.

The test suite refuses to run unless the database name in `.env.test` ends in `_test`, so tests can never wipe your development data.

## 9. Prisma migration commands

Run these from `backend/` (or use the root shortcuts):

| Command                                          | When to use                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run db:deploy` (root: `npm run db:migrate`) | Applies all committed migrations. Use it on a fresh clone and in CI or production. Never prompts and never resets data. |
| `npm run db:migrate`                             | Development only. Creates a new migration after you edit `schema.prisma`, then applies it.                              |
| `npm run db:generate`                            | Regenerates the Prisma client in `src/generated/prisma`. This also runs automatically after `npm install`.              |

The schema has two migrations:

- `init`: creates the users, tasks, task_activities and sessions tables.
- `sessions_binary_collation`: makes `sessions.session_id` case-sensitive (`utf8mb4_bin`), because session IDs are case-sensitive tokens.

## 10. Database seeding

```bash
npm run db:seed        # from the repository root or backend/
```

The seed creates two users. Running it again resets their tasks.

| User       | Email              | Password      | Data                                                                         |
| ---------- | ------------------ | ------------- | ---------------------------------------------------------------------------- |
| Demo User  | `demo@example.com` | `password123` | 12 tasks (some completed, with matching activity entries) and 1 trashed task |
| Jane Smith | `jane@example.com` | `password123` | 1 private task. Use it to check that Demo User can't see or edit it.         |

> ⚠️ **These credentials are for local development only.** The seed script refuses to run when `NODE_ENV=production`.

## 11. Running the backend

```bash
cd backend
npm run dev        # tsx watch; restarts on change → http://localhost:3000
```

Check that it's running: `curl http://localhost:3000/api/health` returns `{"success":true,"message":"OK","data":null}`.

On `SIGINT`/`SIGTERM` the server stops accepting connections, then closes the Prisma connection and the session store.

## 12. Running the frontend

In a second terminal:

```bash
cd frontend
npm run dev        # → http://localhost:5173
```

Vite proxies `/api` to the backend, so the cookie and the API share an origin. Open http://localhost:5173 and log in with `demo@example.com` / `password123`.

From the repository root, `npm run dev:backend` and `npm run dev:frontend` do the same.

## 13. Running tests

```bash
npm test                      # root: backend then frontend
npm --prefix backend test     # backend only (needs MySQL running)
npm --prefix frontend test    # frontend only
```

- **Backend: 108 tests in 7 files.**
  - They're integration tests: Supertest drives the real Express app against the real `task_management_test` database.
  - Migrations are applied once before the run, and every table is emptied before each test.
  - Files run one at a time because they share one database.
  - Coverage: auth and sessions, CSRF, ownership and authorization, validation messages, CRUD, the soft delete → trash → restore → permanent delete flow, search (including escaped `%` and `_`), pagination, statistics, activity recording, and a concurrent-toggle race.
  - The weather tests replace `fetch` with a mock, so they never call the real Open-Meteo service.
- **Frontend: 55 tests in 10 files.**
  - Testing Library in jsdom.
  - Coverage: the login and registration forms (including mapping server errors onto fields), the dashboard and trash pages, the task form, route guards, the filters, the mobile drawer, the weather page, and the Axios client (CSRF token handling, retry on 403, 401 handling).

Run everything CI would (format check, lint, typecheck, tests and builds) with:

```bash
npm run verify
```

> **Windows note:** the `test` scripts go through `scripts/vitest.mjs`. Vitest 5 fails every suite with "failed to find the runner" when the working directory's drive letter is lowercase (`c:\…`, as VS Code terminals often set it). The launcher upper-cases the drive letter and starts Vitest normally.

## 14. Building for production

```bash
npm run build                 # root: both apps

npm --prefix backend run build    # tsc → backend/dist
npm --prefix backend start        # node dist/server.js

npm --prefix frontend run build   # tsc --noEmit && vite build → frontend/dist
npm --prefix frontend run preview # serve the built SPA locally
```

To deploy:

- Serve `frontend/dist` as static files.
- Route `/api` to the Node process on the same origin, or set `VITE_API_BASE_URL` and `FRONTEND_ORIGIN` for a cross-origin setup.
- Set `NODE_ENV=production`, `SESSION_COOKIE_SECURE=true`, a strong `SESSION_SECRET`, and `TRUST_PROXY=true` if TLS ends at a proxy.

## 15. API endpoints

All endpoints are under `/api`. Every response other than 204 uses the same envelope:

```jsonc
// success
{ "success": true, "message": "Tasks retrieved successfully.", "data": [ … ],
  "meta": { "currentPage": 1, "perPage": 10, "total": 25, "lastPage": 3 } }   // meta only on paginated lists

// error
{ "success": false, "message": "Validation failed.",
  "errors": { "title": ["The title field is required."] } }                     // errors only on 422
```

Every `POST`, `PUT`, `PATCH` and `DELETE` request must send the session cookie and an `X-CSRF-Token` header (see [§16](#16-authentication-and-sessions)).

### Auth: `/api/auth`

| Method | Path        | Auth | Body                                                                      | Success                                   |
| ------ | ----------- | ---- | ------------------------------------------------------------------------- | ----------------------------------------- |
| GET    | `/csrf`     | –    | –                                                                         | 200 `{ csrfToken }`                       |
| POST   | `/register` | –    | `name`, `email`, `password` (8 chars to 72 bytes), `passwordConfirmation` | 201 user, session started                 |
| POST   | `/login`    | –    | `email`, `password`                                                       | 200 user, session started                 |
| POST   | `/logout`   | –    | –                                                                         | 200, session destroyed and cookie cleared |
| GET    | `/me`       | ✔    | –                                                                         | 200 current user                          |

`/register` and `/login` are rate-limited to 20 attempts per 15 minutes per IP (429 after that). The user object never includes the password hash:

```json
{ "id": 1, "name": "Demo User", "email": "demo@example.com", "emailVerifiedAt": null, "createdAt": "…" }
```

### Tasks: `/api/tasks` (all endpoints require authentication)

| Method | Path                     | Input                                                                                                                        | Success                                                          |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| GET    | `/`                      | query: `search` (title contains), `status` = `all`\|`pending`\|`completed`, `page` (default 1), `perPage` (1–50, default 10) | 200 tasks + `meta`, newest first                                 |
| POST   | `/`                      | `title` (required, ≤ 255), `description` (≤ 5000, optional), `isCompleted` (optional, default `false`)                       | 201 task                                                         |
| GET    | `/statistics`            | –                                                                                                                            | 200 `{ total, completed, pending, trashed }`                     |
| GET    | `/trash`                 | query: `page`, `perPage`                                                                                                     | 200 trashed tasks + `meta`, most recently deleted first          |
| GET    | `/:id`                   | –                                                                                                                            | 200 task                                                         |
| PUT    | `/:id`                   | full replacement: `title` required; `description` defaults to `null`, `isCompleted` to `false`                               | 200 task                                                         |
| PATCH  | `/:id`                   | any of `title`, `description`, `isCompleted` (at least one)                                                                  | 200 task                                                         |
| DELETE | `/:id`                   | –                                                                                                                            | 204, moves the task to the trash (soft delete)                   |
| PATCH  | `/:id/toggle-completion` | –                                                                                                                            | 200 task; the message says whether it's now completed or pending |
| POST   | `/:id/restore`           | –                                                                                                                            | 200 task (409 if the task isn't in the trash)                    |
| DELETE | `/:id/force-delete`      | –                                                                                                                            | 204 (409 if the task isn't in the trash)                         |

Task object:

```json
{
  "id": 7,
  "userId": 1,
  "title": "Write tests",
  "description": null,
  "isCompleted": false,
  "createdAt": "…",
  "updatedAt": "…",
  "deletedAt": null
}
```

Unknown fields such as `userId` are ignored, so a client can't change a task's owner. `GET`, `PUT`, `PATCH`, `DELETE` and toggle operate only on active tasks. A trashed task returns 404 there until it's restored.

### Activities: `/api/activities` (requires authentication)

| Method | Path      | Input                             | Success                                                                              |
| ------ | --------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/recent` | query: `limit` (1–50, default 10) | 200 `[{ id, taskId, taskTitle, action: "TASK_COMPLETED", createdAt }]`, newest first |

### Weather: `/api/weather` (requires authentication)

| Method | Path | Input                                 | Success                                                                                 |
| ------ | ---- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/`  | query: `city` (required, 2–100 chars) | 200 current weather; see [Step 3](#step-3-public-api-integration-weather) for the shape |

Errors: 422 for an invalid city, 404 when the city can't be found, 502 when Open-Meteo fails or returns something unexpected, and 504 when it times out.

### Status codes

| Code            | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| 200 / 201 / 204 | Read or update / create / delete                                                                 |
| 400             | Malformed JSON body                                                                              |
| 401             | Not logged in, or wrong credentials (`These credentials do not match our records.`)              |
| 403             | Missing or invalid CSRF token                                                                    |
| 404             | Task doesn't exist **or belongs to another user**, city not found, or unknown route              |
| 409             | Restore or permanent delete of a task that isn't trashed, or the task changed during the request |
| 413             | Body larger than 100 KB                                                                          |
| 422             | Validation failed; `errors` holds the messages for each field                                    |
| 429             | Too many login or registration attempts                                                          |
| 500             | Unexpected error. The response is a generic message; details are only logged on the server.      |
| 502             | The external weather service failed or returned an unexpected response                           |
| 504             | The external weather service didn't respond within 5 seconds                                     |

### Example (curl)

```bash
# 1. Get a CSRF token (this also creates the session cookie)
curl -c jar -b jar http://localhost:3000/api/auth/csrf
# 2. Log in (the session is regenerated, so fetch a fresh token afterwards)
curl -c jar -b jar -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" \
     -d '{"email":"demo@example.com","password":"password123"}' http://localhost:3000/api/auth/login
TOKEN=$(curl -s -c jar -b jar http://localhost:3000/api/auth/csrf | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.csrfToken')
# 3. Use the API
curl -b jar "http://localhost:3000/api/tasks?search=test&status=pending&page=1&perPage=10"
curl -b jar -H "Content-Type: application/json" -H "X-CSRF-Token: $TOKEN" \
     -d '{"title":"New task"}' http://localhost:3000/api/tasks
```

## 16. Authentication and sessions

**Login and the session.**

- On a successful login or registration, the server **regenerates the session ID** (preventing session fixation) and stores only `userId` in the session.
- The session row lives in the MySQL `sessions` table. The browser receives only an opaque, signed ID in the `tm.sid` cookie.
- The cookie is `HttpOnly`, so JavaScript can't read it, and `SameSite=Lax`. It's `Secure` when `SESSION_COOKIE_SECURE=true`.
- Sessions expire after `SESSION_MAX_AGE_HOURS`, and the store removes expired rows every 15 minutes.

**Every request.**

- `express-session` loads the session from MySQL.
- The `authenticate` middleware then loads the user by `userId`. If there's no session, or the user no longer exists, it returns 401.

**Logout** destroys the session row and clears the cookie.

**CSRF protection** uses synchronizer tokens (csrf-sync):

- `GET /api/auth/csrf` returns a random token that is stored in the server-side session.
- Every state-changing request must echo the token in the `X-CSRF-Token` header. Otherwise the server returns 403.
- A malicious site can make the browser _send_ the cookie, but it can't _read_ the token, so it can't forge requests.
- Regenerating the session at login or logout invalidates the old token. The frontend therefore drops its cached token after those calls. If the server still rejects a token, the Axios client fetches a fresh one and retries **once**.

**Passwords and credentials.**

- Passwords are hashed with bcrypt (cost 12). Inputs over 72 bytes are rejected, since bcrypt would silently truncate them.
- For an unknown email, login still runs a bcrypt comparison against a dummy hash. Response time and message are then the same as for a wrong password, so the endpoint doesn't reveal which emails are registered.

**Authorization.**

- Every task query is scoped by `userId` in the `WHERE` clause.
- A task that belongs to another user returns **404, not 403**. To the caller it doesn't exist, so task IDs can't be probed.

**Frontend.**

- The `['auth','me']` TanStack Query result is the single source of truth. `ProtectedRoute` redirects to `/login` when it's `null`, and `GuestRoute` keeps logged-in users out of the auth pages.
- A 401 from any protected request clears the cache and sends the user to login.
- Logging in or out clears the whole query cache, so the next user never sees the previous user's data.

## 17. Architectural decisions

1. **Feature modules with routes → controller → service, and no repository layer.** Prisma already is the data-access abstraction. A repository wrapper around it would be indirection without benefit at this size, which the brief warns against. Services hold the business rules, so controllers stay a few lines each.

2. **Sessions in MySQL instead of JWTs.**
   - The brief asks for cookie-based auth. Server-side sessions can be revoked instantly (logout really logs you out) and keep tokens out of JavaScript.
   - Storing them in the existing MySQL database avoids adding Redis.
   - The `sessions` table is defined in the Prisma schema, so migrations own it. The store's auto-create is turned off.

3. **Other users' tasks return 404.** One helper, `findOwnedTask(userId, id, scope)`, puts ownership into the query itself rather than checking it afterwards. A missing ownership check can't hide in one endpoint, and responses don't reveal whether an ID exists.

4. **Soft delete with a `deletedAt` timestamp and explicit scopes.**
   - Queries say which set they want: `active`, `trashed` or `any`. Nothing relies on a global filter that is easy to forget.
   - Restore and permanent delete return 409 for tasks that aren't in the trash, as the brief requires.
   - An index on `(userId, deletedAt, createdAt)` serves the main list, the trash and the statistics.

5. **Atomic, conditional state changes.**
   - Updates use `updateMany` with the expected current state (owner, not deleted, and for toggles the current `isCompleted`) in the `WHERE` clause, then check the affected-row count.
   - If two requests toggle the same task at the same moment, exactly one wins and the other gets 409. Without this, both could "complete" the task and record two activities. A test reproduces the race.

6. **`TaskCompleted` is emitted after the update commits, and only on pending → completed.**
   - The event bus is a small typed in-process emitter. The brief asks for a lightweight event and listener, not a queue.
   - The event is emitted _after_ the update succeeds, so a listener never records a completion that was rolled back.
   - `emit` awaits its listeners and catches their errors. A failing listener is logged and never turns a successful update into a 500.
   - **Trade-off:** the task update and the activity insert are not in one transaction. If the insert fails, the task stays completed and the activity is missing (and logged). That's acceptable for a history feed. If activity were business-critical (billing, audit), the insert would move into the same transaction, or use an outbox table.
   - Completing a task through `PATCH`/`PUT` with `isCompleted: true` goes through the same code path, so it records the event too. Un-completing records nothing.

7. **The activity row stores a snapshot of the title, and its `taskId` is set to `NULL` on delete.** When a task is permanently deleted, its history stays readable ("Completed _Write tests_") instead of disappearing or pointing at a missing row. The database enforces this with `ON DELETE SET NULL`, so permanent delete needs no extra transaction. Deleting a user cascades to their tasks and activities.

8. **Statistics are aggregated in SQL.** A single `GROUP BY isCompleted` and a count of trashed tasks run inside one Prisma `$transaction`, so the numbers come from a consistent snapshot. No task rows are loaded into Node memory.

9. **Validation at the edge with Zod, and Laravel-style 422 errors.**
   - One `validate(schema)` middleware covers `body`, `query` and `params`.
   - Messages are written for people ("The title field is required."), and the frontend maps them back onto form fields.
   - Search input has `%`, `_` and `\` escaped before the `LIKE` query, because Prisma's `contains` doesn't escape them on MySQL. Without escaping, searching for `100%` would match everything that starts with "100".

10. **One error handler and one response envelope.**
    - Services throw `AppError` (401/404/409/422), and the handler turns every error into `{ success, message, errors? }`.
    - Malformed JSON returns 400 and oversized bodies return 413.
    - Anything unexpected becomes a generic 500, with details logged only on the server. Stack traces, SQL and session IDs never reach clients.

11. **The frontend uses server state, not a client store.**
    - TanStack Query caches API data, and mutations simply invalidate the task and activity keys. That's simpler and more correct than updating caches by hand.
    - Filters and the page number live in the URL.
    - Modals use the native `<dialog>` element for focus trapping and Escape handling. A small context provides toasts, so no UI kit is needed.

12. **The tests hit a real database.** The backend tests run against MySQL rather than mocks. That catches what matters here: SQL behaviour such as `LIKE` escaping, cascades, collation and races. A guard refuses to run unless the database name ends in `_test`.

### Known limitations

- The session cookie is `SameSite=Lax`, which assumes the SPA and API are served from the same site, e.g. behind one domain like the dev proxy. Hosting them on different sites would need `SameSite=None; Secure` cookies and matching CORS settings.
- Rate limiting uses the default in-memory store, which is per process. Running several instances behind a load balancer would need a shared store.
- There's no email verification or password reset. The `emailVerifiedAt` column exists, but nothing uses it yet.
- Search matches titles only, with `LIKE %term%`. That's fine at this scale; a large dataset would need a full-text index.
- Weather lookups use the geocoder's top match, so ambiguous names (for example "Springfield") resolve to its most prominent result. There's no way to choose between candidates.
- Weather responses aren't cached on the server, and the endpoint isn't rate-limited beyond requiring a login. Each search makes two calls to Open-Meteo.

---

## Step 3: Public API integration (Weather)

**API used:** [Open-Meteo](https://open-meteo.com/) ([documentation](https://open-meteo.com/en/docs)). It's free for non-commercial use and needs no API key, so **no new environment variable is required**.

### How it works

The React app never calls Open-Meteo. It calls our backend, which:

1. **Validates** the `city` query parameter with Zod (trimmed, required, 2–100 characters). Invalid input returns 422, the same as every other endpoint.
2. **Geocodes** the name with the [Geocoding API](https://open-meteo.com/en/docs/geocoding-api) (`https://geocoding-api.open-meteo.com/v1/search?name=…&count=1`). If there's no match it returns **404** with a friendly message, and the forecast API isn't called.
3. **Fetches current conditions** for the returned coordinates from the [Forecast API](https://open-meteo.com/en/docs) (`https://api.open-meteo.com/v1/forecast?current=…`). Units are °C, km/h and mm, and `timezone=auto` gives the location's local time.
4. **Validates and transforms** the response. Open-Meteo's JSON is checked with a Zod schema and mapped to a small camelCase object. WMO weather codes become readable text ("Partly cloudy"), and `is_day` becomes a boolean.

Failures are converted into safe `AppError`s, so the shared error handler returns the usual envelope:

| Situation                                                              | Response |
| ---------------------------------------------------------------------- | -------- |
| City missing, blank, shorter than 2 characters or longer than 100      | 422      |
| No geocoding match                                                     | 404      |
| Open-Meteo unreachable, returns an HTTP error, or sends malformed data | 502      |
| An Open-Meteo call takes longer than 5 seconds (`AbortSignal.timeout`) | 504      |

Open-Meteo's own error text is never forwarded. It's only logged on the server. The backend uses Node's built-in `fetch`, so no HTTP client dependency was added.

### Endpoint

```http
GET /api/weather?city=Lahore
```

```json
{
  "success": true,
  "message": "Weather retrieved successfully.",
  "data": {
    "city": "Lahore",
    "region": "Punjab",
    "country": "Pakistan",
    "temperature": 24,
    "feelsLike": 24,
    "humidity": 46,
    "condition": "Clear sky",
    "weatherCode": 0,
    "windSpeed": 4.1,
    "precipitation": 0,
    "isDay": true,
    "observedAt": "2026-11-18T12:15",
    "timezone": "Asia/Karachi"
  }
}
```

The values are illustrative. Two decisions differ from the Step 3 example on purpose, to match the rest of this API:

- Field names are **camelCase inside the standard `{ success, message, data }` envelope**, rather than snake_case.
- Invalid input returns **422** rather than 400.

The endpoint needs a login, like the page that uses it, so it can't serve as an anonymous proxy to Open-Meteo.

### Weather page

Sign in, then choose **Weather** in the sidebar, or open http://localhost:5173/weather.

- Type a city and press **Enter** or click **Search**. Empty searches are blocked in the browser.
- While a request is in flight, the button shows a spinner and further submissions are ignored.
- A new city shows a loading state instead of the previous city's weather.
- The card shows the city, region and country, the temperature in °C, the condition with an icon (day and night variants), feels-like, humidity, wind speed, precipitation, and the local observation time.
- "City not found" and "service unavailable" have their own messages; the latter includes a **Try again** button.
- The searched city is kept in the URL (`/weather?city=Lahore`), so refresh and back/forward work.

**Cities to try:** `Lahore`, `London`, `Tokyo` (also offered as one-click suggestions), and something like `Atlantisville` to see the not-found message.
