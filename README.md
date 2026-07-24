# Plank

**A premium team task tracker for small teams.** A Trello-style Kanban board plus
team modules — an async daily standup, personal notes, and real-time mention
notifications. Web, mobile-responsive, and a native macOS desktop app.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-149ECA?logo=react&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

---

## Features

**Kanban board**
- Drag-and-drop cards and columns (dnd-kit) with fractional positions — no renumbering.
- Labels, assignees with avatars, checklists with progress.
- Due dates with an optional time, overdue highlighting.
- Comments with `@mentions`; a mention lands in the recipient's notification bell.
- Complete a task with a checkmark, or archive it (remove from the board without deleting).
- Duplicate a card with its labels and checklist in one click.
- Per-board and per-column colors, search, label filtering, and a "my cards" filter.
- Colored, collapsible board folders in the sidebar — drag boards in and out.
- Export a board to Excel (`.xlsx`).

**Team modules**
- **Board chat** — a shared message stream per board for quick questions, with an unread indicator.
- **Daily** — an async standup: pick a day and a teammate to see their Done / In progress / Planned.
- **Personal notes** — a private space, like Apple Notes.

**System**
- Real-time mention notifications (WebSocket, "signal → refetch" model).
- A one-click button to sync the whole app state on demand.
- Avatars: 8 gradient presets or a photo upload (resized on the client).
- Light and dark themes, mobile-responsive layout, keyboard accessibility.
- Accounts and access: passwords hashed with argon2, session as a JWT in an
  httpOnly cookie, admin roles, per-user board access.
- Native macOS desktop app (Tauri) — a lightweight native window around the app.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React + Vite + TypeScript, dnd-kit, hand-built components and design tokens |
| Backend | Node + Fastify + TypeScript, PostgreSQL (node-pg), WebSocket |
| Auth | argon2, JWT in an httpOnly cookie |
| Desktop | Tauri (Rust + system webview) |
| Infrastructure | Docker Compose, Caddy (automatic TLS), single-image deploy to a VPS |

The stack is deliberately lightweight and self-contained — the whole production
runs on a ~1 GB RAM VPS: no Redis/Elasticsearch, real-time over a plain WebSocket.

## Structure

```
apps/web      — SPA: React + Vite
apps/api      — REST + WebSocket: Fastify + PostgreSQL
apps/desktop  — desktop wrapper (Tauri, macOS)
infra         — Docker Compose, Caddy, deploy script
docs          — architecture decisions
```

An npm-workspaces monorepo. Dependencies point one way: UI → logic → data.

## Getting started

```bash
# 1. Database
docker compose up -d db

# 2. Environment
cp .env.example .env          # set AUTH_SECRET (openssl rand -hex 32)

# 3. Install and run (frontend + backend)
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`, the API on `http://localhost:3000`.

```bash
npm test          # tests
npm run lint      # linter
npm run typecheck # type checking
npm run build     # production build
```

## Deployment

The image is built locally (or in CI) and shipped to the server ready-made via
`docker save | ssh`. Caddy terminates TLS (Let's Encrypt); PostgreSQL stays on the
internal Docker network only. See [infra/](infra/) and [docs/decisions.md](docs/decisions.md).

## Architecture decisions

Key decisions are briefly recorded in [docs/decisions.md](docs/decisions.md) —
why the lightweight stack, why a JWT in a cookie, why the "signal → refetch"
real-time model, and so on. *(Notes are in Russian.)*

---

**Keywords:** task tracker · kanban board · trello alternative · project
management · team collaboration · async standup · real-time · drag and drop ·
react · typescript · fastify · node.js · postgresql · websocket · tauri · desktop
app · vite · monorepo · docker · self-hosted
