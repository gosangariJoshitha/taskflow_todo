# TaskFlow

Take-home assignment submission - a small Trello-style task board.

Board → Columns → Tasks. You can create/edit/delete tasks, move them between
columns, and filter by priority. Everything is backed by a real SQLite
database, not local state.

**Stack:** React + Vite on the frontend, Node/Express on the backend, SQLite
(`better-sqlite3`) as the database.

---

## Project structure

```
taskflow/
├── backend/
│   ├── src/
│   │   ├── schema.sql          # table definitions (see below)
│   │   ├── db.js               # opens the SQLite file, runs schema.sql
│   │   ├── seed.js             # wipes + reseeds a demo board
│   │   ├── queries.js          # the two required "real" queries
│   │   ├── taskRepository.js   # CRUD helpers used by the routes
│   │   └── server.js           # Express app + routes
│   └── tests/                  # backend tests, run against a throwaway db file
└── frontend/
    └── src/
        ├── api.js              # all fetch calls in one place
        ├── App.jsx             # board state + filtering
        └── components/         # Column, TaskCard, TaskForm
```

## Running it locally

Needs Node 18+.

**Backend:**
```bash
cd backend
npm install
npm run seed      # creates taskflow.db with one board + sample tasks
npm run dev        # http://localhost:4000
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Open `http://localhost:5173`. Vite proxies `/api/*` to the backend in dev
(see `vite.config.js`) so nothing else needs configuring.

**Tests:**
```bash
cd backend
npm test
```
Uses a separate `tests/test.db` file so it never touches your real db.

## Data model

`Board 1—* Column 1—* Task`. A task's `column_id` is basically its status -
whichever column it's in is its status, so I didn't add a separate field for
that, it would just be a second source of truth for the same thing.

## Schema

```sql
CREATE TABLE boards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE columns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id    INTEGER NOT NULL,
    title        TEXT NOT NULL CHECK (trim(title) <> ''),
    description  TEXT,
    priority     TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);
```

Full file with indexes is in `backend/src/schema.sql`. It runs with
`IF NOT EXISTS` every time the server boots, so it's safe to run repeatedly.

## The two required queries

Both live in `backend/src/queries.js`, actual SQL, not "get everything and
filter in JS":

**Task count per column** (LEFT JOIN so an empty column still shows 0):
```sql
SELECT c.id AS column_id, c.name AS column_name, c.position, COUNT(t.id) AS task_count
FROM columns c
LEFT JOIN tasks t ON t.column_id = c.id
WHERE c.board_id = ?
GROUP BY c.id, c.name, c.position
ORDER BY c.position ASC;
```

**Tasks by priority, newest first:**
```sql
SELECT t.id, t.title, t.description, t.priority, t.created_at, t.column_id, c.name AS column_name
FROM tasks t
JOIN columns c ON c.id = t.column_id
WHERE c.board_id = ? AND t.priority = ?
ORDER BY datetime(t.created_at) DESC, t.id DESC;
```

The priority filter on the board itself (`/api/board?priority=`) reuses the
same idea; `/api/tasks/by-priority/:priority` exposes it as its own endpoint
if you want to hit it directly.

## API

| Method | Route | What it does |
|---|---|---|
| GET | `/api/board` | Full board with columns + tasks (`?priority=High` to filter) |
| GET | `/api/columns/counts` | Query 1 - task count per column |
| GET | `/api/tasks/by-priority/:priority` | Query 2 - tasks by priority, newest first |
| POST | `/api/tasks` | Create a task (title required, validated server-side) |
| PUT | `/api/tasks/:id` | Edit title/description/priority |
| PATCH | `/api/tasks/:id/move` | Move a task to a different column |
| DELETE | `/api/tasks/:id` | Delete a task |

## Deploying it

I deployed the backend on Render (free web service) and the frontend on
Vercel.

**Backend (Render):**
1. New Web Service → connect the repo → set root directory to `backend`
2. Build command: `npm install`
3. Start command: `npm run seed && npm start` (reseeds on every boot, so the
   demo data is always there when someone opens the link - free tier doesn't
   keep a persistent disk, so this is the easiest way around that)
4. Instance type: Free

**Frontend (Vercel):**
1. Import the repo, root directory `frontend`
2. Add env var `VITE_API_URL` pointing at the Render backend, e.g.
   `https://taskflow-backend.onrender.com/api`
3. Deploy

Locally you don't need `VITE_API_URL` at all - the Vite proxy handles it.

## Assumptions I made

- Single board, no login - the brief explicitly said multi-board/auth is out
  of scope, so the backend just always works with board #1 (created by the
  seed script) instead of building board-switching UI nobody asked for.
- Went with a dropdown for moving tasks instead of drag-and-drop, since the
  brief says a working dropdown beats a broken drag-and-drop, and I'd rather
  spend the time budget on the DB/validation side which is what's actually
  being graded closely.
- Status = `column_id`, no separate status column (see Data model above).
- Empty title is blocked both in the form and on the backend - there's a
  CHECK constraint in the schema plus an explicit check in the route so the
  error message stays readable instead of a raw SQLite error leaking through.
- Search by title (the nice-to-have) is done client-side against the board
  that's already loaded, didn't see a reason to round-trip to the server for
  filtering data I already have.
- Optimistic update on move - the dropdown updates the board immediately and
  only re-fetches from the server if the request actually fails.

## What I'd add with more time

- Real drag-and-drop, keeping the dropdown as a fallback
- Wire the `/api/columns/counts` endpoint into the column headers instead of
  deriving the count client-side (both give the same number right now, the
  endpoint's built and tested, just not used by the UI yet)
- Optimistic UI for create/edit/delete too, not just move
- Toast notifications instead of a dismissible banner for errors

## Time spent

Around 3-4 hours - schema and backend first, then the API, then the UI, then
tests and this write-up.

## One thing I looked into

While writing the "newest first" query I ended up double-checking how SQLite
sorts text-stored timestamps. `datetime('now')` gives you
`YYYY-MM-DD HH:MM:SS`, and that happens to sort correctly as plain text only
because the format is zero-padded and goes biggest-unit-first. Wrapped the
column in `datetime(...)` in the `ORDER BY` anyway instead of relying on
that, felt like cheap insurance in case the format ever changes.
