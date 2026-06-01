# Backend API Structure — Autiq Africa

## Base URL
```
http://localhost:8005/api
```

---

## Enterprise Admin — Authentication

### POST /api/admin/enterprise/login

Authenticate an Enterprise Admin and receive a JWT token.

**Auth required:** No  
**Rate limit:** Strict auth limiter (20 req / 15 min per IP)

**Request body:**
```json
{
  "email": "hiraljivan@autiqafrica.com",
  "password": "Autiq@2026"
}
```

**Validation rules:**
- `email` — required, must be valid email format
- `password` — required, non-empty

**Success response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<access_token_jwt>",
    "refreshToken": "<refresh_token_jwt>",
    "user": {
      "id": "cmpg...",
      "fullName": "Hiral Jivan",
      "email": "hiraljivan@autiqafrica.com",
      "role": "Enterprise Admin",
      "adminCode": "ADM-002",
      "clientId": "cmpg..."
    }
  }
}
```

**Failure response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**Failure response — inactive account (403):**
```json
{
  "success": false,
  "message": "Account is inactive. Contact your administrator."
}
```

**Security:**
- Password compared using bcrypt (12 salt rounds)
- Generic error message — does not reveal whether email or password is wrong
- Login attempt (success and failure) recorded in `login_activities` table
- JWT access token expires in 8h; refresh token in 7d

**JWT payload:**
```json
{
  "sub": "<adminId>",
  "id": "<adminId>",
  "role": "Enterprise Admin",
  "type": "enterprise_admin",
  "clientId": "<clientId>"
}
```

---

## Enterprise Admin — Workshops

### GET /api/admin/enterprise/workshops

List all workshops belonging to the logged-in enterprise admin's client.

**Auth required:** Yes — Bearer token  
**Role required:** `Enterprise Admin` or `Support Admin`

**Headers:**
```
Authorization: Bearer <token>
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Workshops retrieved successfully",
  "data": {
    "workshops": [
      {
        "id": "cmpg...",
        "clientId": "cmpg...",
        "workshopCode": "WS-0001",
        "name": "Prestige Service Hub",
        "type": "Service",
        "city": "Johannesburg",
        "workshopCountry": "South Africa",
        "openingTime": "10:00",
        "closingTime": "20:00",
        "dailyJobLimit": 25,
        "status": "Active",
        "createdAt": "2026-05-22T..."
      }
    ]
  }
}
```

---

### POST /api/admin/enterprise/workshops

Create a new workshop under the logged-in Enterprise Admin's client.

**Auth required:** Yes — Bearer token  
**Role required:** `Enterprise Admin` or `Support Admin`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Prestige Service Hub",
  "phone": "+27 000 000 000",
  "email": "workshop@example.com",
  "addressLine1": "123 Main Road",
  "addressLine2": "Unit 4",
  "city": "Johannesburg",
  "state": "Gauteng",
  "country": "South Africa",
  "postalCode": "2000",
  "openingTime": "10:00",
  "closingTime": "20:00",
  "dailyJobLimit": 25
}
```

**Validation rules:**
| Field | Rule |
|---|---|
| `name` | Required |
| `city` | Required |
| `country` | Required |
| `openingTime` | Required, format HH:mm |
| `closingTime` | Required, format HH:mm, must be after `openingTime` |
| `dailyJobLimit` | Required, positive integer |
| `email` | Optional, valid email if provided |
| `phone` | Optional |
| `addressLine1` | Optional |
| `addressLine2` | Optional |
| `state` | Optional |
| `postalCode` | Optional |

**Success response (201):**
```json
{
  "success": true,
  "message": "Workshop created successfully",
  "data": {
    "workshop": {
      "id": "cmpg...",
      "clientId": "cmpg...",
      "workshopCode": "WS-0001",
      "name": "Prestige Service Hub",
      "phone": "+27 000 000 000",
      "email": "workshop@example.com",
      "addressLine1": "123 Main Road",
      "addressLine2": "Unit 4",
      "city": "Johannesburg",
      "state": "Gauteng",
      "workshopCountry": "South Africa",
      "postalCode": "2000",
      "openingTime": "10:00",
      "closingTime": "20:00",
      "dailyJobLimit": 25,
      "status": "Active",
      "createdByAdminId": "cmpg...",
      "createdAt": "2026-05-22T..."
    }
  }
}
```

**Failure — validation error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "msg": "City is required", "path": "city", "location": "body" }
  ]
}
```

**Failure — admin not linked to a client (403):**
```json
{
  "success": false,
  "message": "This enterprise admin account is not linked to a client. Contact support."
}
```

**Logic:**
1. Extracts `adminId` and `clientId` from JWT
2. Returns 403 if `clientId` is null (platform admin not linked to a dealer group)
3. Generates sequential `workshopCode` (e.g., `WS-0001`)
4. Sets `status = Active`, `createdByAdminId = adminId`
5. Records workshop creation in server logs

---

## Other Enterprise Admin Endpoints (stubs — 501)

These endpoints are defined but return `501 Not Implemented`. They will be fully implemented in future phases.

| Method | Path | Description |
|---|---|---|
| GET | /api/admin/enterprise/clients | List clients |
| GET | /api/admin/enterprise/users | List workshop users |
| GET | /api/admin/enterprise/login-activity | Login activity log |
| GET | /api/admin/enterprise/revenue | Revenue summary |
| GET | /api/admin/enterprise/admin-users | List admin users |
| POST | /api/admin/enterprise/admin-users | Create admin user |
| DELETE | /api/admin/enterprise/admin-users/:id | Remove admin user |
| GET | /api/admin/enterprise/data-export | Data export |

---

## Workshop User Login (existing, unchanged)

### POST /api/auth/login
Workshop staff (Technician, FrontDesk, etc.) login.

### POST /api/auth/admin/login
Enterprise Admin login (legacy endpoint — still works, returns same JWT structure).

---

## Health Check

### GET /api/health
```json
{ "status": "ok", "service": "autiq-africa-backend" }
```

---

## Test Commands

### Login
```bash
curl -X POST http://localhost:8005/api/admin/enterprise/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"hiraljivan@autiqafrica.com\",\"password\":\"Autiq@2026\"}"
```

### Create workshop (replace TOKEN with value from login response)
```bash
curl -X POST http://localhost:8005/api/admin/enterprise/workshops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d "{\"name\":\"Prestige Service Hub\",\"phone\":\"+27 000 000 000\",\"email\":\"workshop@example.com\",\"addressLine1\":\"123 Main Road\",\"addressLine2\":\"Unit 4\",\"city\":\"Johannesburg\",\"state\":\"Gauteng\",\"country\":\"South Africa\",\"postalCode\":\"2000\",\"openingTime\":\"10:00\",\"closingTime\":\"20:00\",\"dailyJobLimit\":25}"
```

### List workshops
```bash
curl -X GET http://localhost:8005/api/admin/enterprise/workshops \
  -H "Authorization: Bearer TOKEN"
```
