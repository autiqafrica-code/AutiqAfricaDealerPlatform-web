# Admin API Structure

Backend base URL: `http://localhost:5010/api`

All admin endpoints require a valid JWT in the `Authorization: Bearer <token>` header.
Admin JWTs are issued by `POST /api/auth/admin/login`.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/admin/login` | Sign in as Enterprise Admin or Support Admin |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

---

## Enterprise Admin Endpoints

> Requires role: `Enterprise Admin` **or** `Support Admin`
> All queries are scoped to the authenticated admin's enterprise account.

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/admin/enterprise/clients` | List all clients for this enterprise | Stub |
| GET | `/api/admin/enterprise/workshops` | List all workshops for this enterprise | Stub |
| GET | `/api/admin/enterprise/users` | List all workshop users | Stub |
| GET | `/api/admin/enterprise/login-activity` | Paginated login activity log | Stub |
| GET | `/api/admin/enterprise/revenue` | Revenue summary | Stub |
| GET | `/api/admin/enterprise/admin-users` | List enterprise admin users | Stub |
| POST | `/api/admin/enterprise/admin-users` | Create new enterprise admin user | Stub |
| DELETE | `/api/admin/enterprise/admin-users/:id` | Remove enterprise admin user | Stub |
| GET | `/api/admin/enterprise/data-export` | Export enterprise data | Stub |

**Response shape (list endpoints):**
```json
{
  "success": true,
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 20 }
}
```

---

## Support Admin Endpoints

> Requires role: `Support Admin` **only** — Enterprise Admins are denied (403)

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/admin/support/clients` | All clients platform-wide | Stub |
| GET | `/api/admin/support/workshops` | All workshops platform-wide | Stub |
| GET | `/api/admin/support/users` | All platform users | Stub |
| GET | `/api/admin/support/audit-logs` | Platform audit log (paginated) | Stub |
| GET | `/api/admin/support/system-health` | Service health status | Stub |
| GET | `/api/admin/support/env-variables` | List env vars (masked values) | Stub |
| PATCH | `/api/admin/support/env-variables/:key` | Update env variable | Stub |
| GET | `/api/admin/support/feature-flags` | List feature flags | Stub |
| PATCH | `/api/admin/support/feature-flags/:key` | Enable/disable feature flag | Stub |
| POST | `/api/admin/support/impersonate` | Start impersonation session | Not Implemented |
| DELETE | `/api/admin/support/impersonate` | End impersonation session | Not Implemented |

---

## Security Rules

1. **Env variables** — backend returns masked values only (`••••••••abc1`). Raw values are never sent to the browser.
2. **Env variable updates** — requires elevated re-authentication flow (not yet designed).
3. **Feature flag updates** — logged to audit trail automatically.
4. **Impersonation** — disabled until separate security design review is complete.
5. **Audit logs** — append-only, cannot be deleted via API.
6. **Enterprise Admin** cannot access any `/api/admin/support/*` endpoint.

---

## JWT Payload Shapes

**Enterprise Admin:**
```json
{
  "sub": "adm_xxxx",
  "id": "adm_xxxx",
  "role": "Enterprise Admin",
  "type": "enterprise_admin"
}
```

**Support Admin:**
```json
{
  "sub": "adm_xxxx",
  "id": "adm_xxxx",
  "role": "Support Admin",
  "type": "support_admin"
}
```

---

## Files

| File | Purpose |
|------|---------|
| `backend/src/routes/admin/enterprise.routes.js` | Enterprise admin route definitions |
| `backend/src/routes/admin/support.routes.js` | Support admin route definitions |
| `backend/src/controllers/admin/enterprise.controller.js` | Enterprise admin request handlers |
| `backend/src/controllers/admin/support.controller.js` | Support admin request handlers |
| `backend/src/services/admin/enterprise.service.js` | Enterprise admin DB service layer |
| `backend/src/services/admin/support.service.js` | Support admin DB service layer |
| `backend/src/middleware/permission.middleware.js` | Role-based access control middleware |
