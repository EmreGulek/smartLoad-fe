# SmartLoad — Frontend

React (JSX) + Vite + Bootstrap 5 + react-bootstrap + react-three-fiber.

## Quick Start

```bash
# Clean reinstall (recommended after switching from TS+Tailwind)
rm -rf node_modules package-lock.json
npm install
npm run dev
```

Open http://localhost:5173

## Stack

- **React 18** (JSX, no TypeScript)
- **Vite 5** — dev server + build
- **Bootstrap 5** + **react-bootstrap** — UI components
- **bootstrap-icons** — icon set
- **SCSS** (via `sass`) — Bootstrap theme variable override
- **react-three-fiber** + **@react-three/drei** — 3D viewer
- **Zustand** — global state
- **React Router v6** — routing
- **Axios** — HTTP client (proxied to Spring Boot on :8080)
- **react-hook-form** — form state + validation
- **SheetJS (xlsx)** — Excel parse

## Pages

- `/` — Home (quick-action dashboard)
- `/viewer` — B777F 3D viewer

## Folder Structure

```
src/
├── components/
│   ├── layout/        # AppLayout, Sidebar, TopNavbar
│   ├── viewer/        # B777FViewer (r3f)
│   ├── manifest/      # Phase 1 (Excel ingest UI)
│   ├── loadplan/      # Phase 3 (results)
│   └── shared/        # StatusBadge, etc.
├── pages/             # Route-level pages
├── services/          # API clients (axios)
├── hooks/             # Custom React hooks (Phase 1+)
├── store/             # Zustand stores
├── utils/             # Pure helpers (b777fContours, etc.)
└── styles/            # SCSS theme + globals
```

## Aviation Light Theme

`src/styles/aviation-theme.scss` overrides Bootstrap's SCSS variables with a
Boeing-navy/sky-blue palette intended for professional aviation operations
software (matches SkyPallet visual conventions).

## Backend

The Spring Boot backend lives in `../smartLoad-backend/`.
Vite proxies `/api/*` → `http://localhost:8080`.
