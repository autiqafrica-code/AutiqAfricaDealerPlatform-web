# Autiq Africa — Frontend (Workshop App)

**URL:** http://localhost:8174

Workshop staff application for all non-admin roles.

---

## Roles

| Role | Home Route |
|------|-----------|
| Front Desk | `/front-desk` |
| Technician | `/technician` |
| Manager | `/manager` |
| Workshop Controller | `/workshop` |
| Accounts | `/accounts` |
| Parts Interpreter | `/parts` |
| Parts Controller | `/parts` |
| CEO | `/ceo` |

Route access per role is defined in `src/data/mockData.js` → `roleAccess`.

---

## Dev Setup

```bash
# From project root (recommended)
npm run dev:frontend

# Or directly
cd frontend
npm install
npm run dev
# → http://localhost:8174
```

---

## Environment

```bash
copy .env.example .env.local
```

See `.env.example` for all available variables. The frontend currently uses mock data and does **not** call the backend API — env vars are placeholders for the upcoming API integration phase.

---

## Tech Stack

- React 18
- Vite 5 (port 8174)
- React Router v6
- Lucide React icons
- No external state management — local `useState` + `localStorage`

---

## Structure

```
frontend/src/
  components/
    Layout.jsx               ← Sidebar, role-aware nav
    AppointmentCalendar.jsx
    QuotationWorkbench.jsx
    MarketingHeader.jsx
    AppFooter.jsx
  data/
    mockData.js              ← All roles, clients, workshops, jobs, users (mock)
  pages/
    public/                  ← Landing, Login, Features, Pricing, etc.
    enterprise/              ← Enterprise Admin screens (legacy — migrating to admin/)
    frontdesk/               ← Front Desk screens
    technician/              ← Technician screens
    manager/                 ← Manager screens
    workshop/                ← Workshop Controller screens
    accounts/                ← Accounts screens
    parts/                   ← Parts screens
    ceo/                     ← CEO screens
    shared/                  ← Dashboard, Kanban, Calendar (used by multiple roles)
    reports/                 ← Reports screens
  styles/
    global.css               ← Full design system (CSS variables, layout, components)
  App.jsx                    ← All routes + ProtectedRoute logic
  main.jsx                   ← React entry point
```

---

## Notes

- Enterprise Admin screens in `src/pages/enterprise/` are legacy copies. The authoritative versions are now in `admin/src/pages/enterprise-admin/`. These originals will be removed once the admin portal is fully wired to real APIs.
- All data is currently sourced from `src/data/mockData.js`. Backend integration is a future phase.
- Auth state is stored in `localStorage` (`autiqRole`, `autiqLoggedIn`).
