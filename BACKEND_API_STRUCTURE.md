# Autiq Africa — Backend API Structure

> **Status:** Structure created. Business logic to be implemented next.
> **Base URL:** `http://localhost:4000/api`
> **Auth:** Bearer JWT token in `Authorization` header (except public portal routes and health check).

---

## Auth Types

| Token type | Payload fields | Notes |
|---|---|---|
| Workshop user | `{ id, workshopId, role, type: 'user' }` | All operational roles |
| Enterprise Admin | `{ id, role: 'Super Admin', type: 'enterprise_admin' }` | Platform-level access only |
| Customer portal | One-time UUID token passed in URL path | No JWT — token validated against `quotations.approval_token` |

---

## 1. Authentication

### `POST /api/auth/login`
**Purpose:** Workshop user login  
**Auth:** None  
**Request:**
```json
{ "email": "tech01@workshop.com", "password": "Autiq@Tech1" }
```
**Response:**
```json
{
  "token": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "...", "name": "Technician 01", "role": "Technician", "workshopId": "..." }
}
```
**Tables:** `users`, `login_activities`

---

### `POST /api/auth/admin/login`
**Purpose:** Enterprise Admin login  
**Auth:** None  
**Request:** `{ "email": "...", "password": "..." }`  
**Tables:** `enterprise_admins`, `login_activities`

---

### `POST /api/auth/refresh`
**Purpose:** Refresh access token  
**Request:** `{ "refreshToken": "..." }`

### `POST /api/auth/logout`
**Purpose:** Invalidate session

### `POST /api/auth/forgot-password`
**Purpose:** Request password reset link  
**Request:** `{ "email": "..." }`

### `POST /api/auth/reset-password`
**Purpose:** Complete password reset  
**Request:** `{ "token": "...", "newPassword": "..." }`

---

## 2. Clients (Enterprise Admin only)

### `GET /api/clients`
**Purpose:** List all dealer clients  
**Auth:** Enterprise Admin  
**Query params:** `?status=Active&country=Nigeria&sort=name&page=1&limit=20`  
**Response:** `{ data: [clients], meta: { total, page, limit } }`  
**Tables:** `clients`, `client_modules`

### `POST /api/clients`
**Purpose:** Create new dealer client (onboard)  
**Request:**
```json
{
  "name": "Lagos Premium Motors",
  "country": "Nigeria",
  "defaultCurrency": "NGN",
  "abn": "...",
  "dealerLicenceNumber": "...",
  "website": "https://..."
}
```
**Tables:** `clients`

### `GET /api/clients/:id` — Get client details  
### `PUT /api/clients/:id` — Update client details  
### `PATCH /api/clients/:id/status` — `{ "status": "Active" | "Inactive" | "Archived" }`  
### `DELETE /api/clients/:id` — Soft delete  
### `GET /api/clients/:id/modules` — Get enabled modules for client  
### `POST /api/clients/:id/modules` — Update module configuration  
**Request:** `{ "moduleIds": ["id1", "id2"], "enabled": true }`

---

## 3. Workshops (Enterprise Admin)

### `GET /api/workshops`
**Purpose:** List workshops (Enterprise Admin: all; others: own workshop only)  
**Query params:** `?clientId=...&status=Active`  
**Tables:** `workshops`, `clients`

### `POST /api/workshops`
**Purpose:** Create workshop under a client  
**Request:**
```json
{
  "clientId": "...",
  "name": "Ikeja Service Workshop",
  "type": "Service",
  "address": "12 Marina Road, Ikeja",
  "phone": "+234 801 555 0101",
  "whatsapp": "+234 801 555 0101",
  "email": "ikeja@lagospremium.com",
  "openingTime": "10:00",
  "closingTime": "20:00",
  "dailyJobLimit": 30,
  "ceoName": "Ada Okeke",
  "ceoEmail": "ada@lagospremium.com",
  "currency": "NGN"
}
```
**Tables:** `workshops`

### `GET /api/workshops/:id` — Get workshop  
### `PUT /api/workshops/:id` — Update workshop details  
### `PATCH /api/workshops/:id/status` — `{ "status": "Active" | "Inactive" }`  
### `GET /api/workshops/:id/users` — List all users in workshop  
### `GET /api/workshops/:id/schedule` — `{ openingTime, closingTime, dailyJobLimit }`  
### `PUT /api/workshops/:id/schedule` — Update schedule/capacity (CEO, Manager, EA)

---

## 4. Users (Enterprise Admin)

### `GET /api/users`
**Purpose:** List workshop users  
**Query params:** `?workshopId=...&role=Technician&status=Active`  
**Tables:** `users`

### `POST /api/users`
**Purpose:** Create a single workshop user  
**Request:**
```json
{
  "workshopId": "...",
  "name": "Technician 01",
  "loginEmail": "tech01@lagospremium.com",
  "password": "Autiq@Tech1",
  "role": "Technician"
}
```
**Tables:** `users`

### `POST /api/users/bulk`
**Purpose:** Bulk create users from onboarding role counts  
**Request:**
```json
{
  "workshopId": "...",
  "counts": {
    "Technician": 8,
    "WorkshopController": 2,
    "FrontDesk": 4,
    "Accounts": 2,
    "Manager": 2,
    "PartsInterpreter": 2,
    "PartsController": 1
  }
}
```

### `GET /api/users/:id` — Get user profile  
### `PUT /api/users/:id` — Update user  
### `PATCH /api/users/:id/status` — `{ "status": "Active" | "Inactive" | "Blocked" }`  
### `PATCH /api/users/:id/password` — `{ "newPassword": "..." }`  
### `DELETE /api/users/:id` — Soft delete  
### `POST /api/users/:id/send-credentials` — `{ "channel": "Email" | "WhatsApp" }`

---

## 5. Customers (Front Desk, Manager, Accounts, CEO)

### `GET /api/customers`
**Purpose:** List customers in workshop  
**Query params:** `?search=Amina&workshopId=...`  
**Tables:** `customers`

### `POST /api/customers`
**Purpose:** Create new customer (Front Desk)  
**Auth Roles:** FrontDesk, Manager  
**Request:**
```json
{
  "name": "Amina Okafor",
  "phone": "+27 10 001 2345",
  "email": "amina@email.com",
  "whatsapp": "+27 72 555 0199",
  "communicationPreference": "WhatsApp",
  "licenseNumber": "DL-2048-7781",
  "address": "Street, suburb, city"
}
```
**Tables:** `customers`

### `GET /api/customers/:id` — Get customer  
### `PUT /api/customers/:id` — Update customer  
### `DELETE /api/customers/:id` — Soft delete (Manager/CEO only)  
### `GET /api/customers/:id/vehicles` — All vehicles  
### `GET /api/customers/:id/quotations` — All quotations  
### `GET /api/customers/:id/jobs` — All job cards  
### `POST /api/customers/:id/verify-phone` — Mark phone verified  
### `POST /api/customers/:id/verify-email` — Mark email verified  
### `POST /api/customers/:id/verify-whatsapp` — Mark WhatsApp verified

---

## 6. Vehicles (Front Desk)

### `GET /api/vehicles`
**Query params:** `?customerId=...&search=CA245889`  
**Tables:** `vehicles`

### `POST /api/vehicles`
**Request:**
```json
{
  "customerId": "...",
  "registrationNo": "CA 245 889",
  "vin": "ABC123...",
  "makeModel": "Toyota Hilux 2.8 GD-6",
  "mileage": 82400,
  "vehicleType": "Private",
  "notes": "Good condition"
}
```
**Tables:** `vehicles`

### `GET /api/vehicles/:id` — Get vehicle  
### `PUT /api/vehicles/:id` — Update  
### `DELETE /api/vehicles/:id` — Soft delete

---

## 7. Appointments / Calendar

### `GET /api/appointments`
**Purpose:** Calendar data for selected date range  
**Query params:** `?workshopId=...&from=2026-05-11&to=2026-05-17`  
**Tables:** `appointments`, `customers`, `vehicles`

### `POST /api/appointments`
**Request:**
```json
{
  "customerId": "...",
  "vehicleId": "...",
  "appointmentDate": "2026-05-11",
  "appointmentTime": "10:00",
  "serviceType": "Service intake",
  "notes": "..."
}
```
**Tables:** `appointments`

### `GET /api/appointments/:id` — Get appointment  
### `PUT /api/appointments/:id` — Update  
### `PATCH /api/appointments/:id/status` — `{ "status": "Confirmed" | "Cancelled" | "Completed" }`  
### `DELETE /api/appointments/:id` — Cancel

---

## 8. Quotations (Multi-role workflow)

### `GET /api/quotations`
**Purpose:** List quotations by role context  
**Query params:** `?workshopId=...&status=Draft&page=1`  
**Tables:** `quotations`, `customers`, `vehicles`

### `POST /api/quotations`
**Auth Roles:** FrontDesk  
**Purpose:** Create draft quotation  
**Request:**
```json
{
  "customerId": "...",
  "vehicleId": "...",
  "repairType": "Brake Repair",
  "priority": "Amber",
  "customerComplaint": "Brake noise and vibration"
}
```
**Tables:** `quotations`

### `GET /api/quotations/:id` — Full quotation with line items, updates, media  
### `PUT /api/quotations/:id` — Update quotation  
### `DELETE /api/quotations/:id` — Soft delete

### `POST /api/quotations/:id/send-internal`
**Purpose:** Send quote to technician / workshop controller / parts interpreter  
**Auth Roles:** FrontDesk  
**Request:** `{ "sendToTechnician": true, "sendToWorkshopController": true, "sendToPartsInterpreter": false }`  
**Tables:** `quotations`, `notifications`

### `POST /api/quotations/:id/send-to-customer`
**Purpose:** Generate approval token and send to customer  
**Auth Roles:** FrontDesk  
**Request:** `{ "channel": "WhatsApp" | "Email" }`  
**Tables:** `quotations`, `notifications`

### `POST /api/quotations/:id/line-items`
**Request:** `{ "item": "Brake pad replacement", "addedByRole": "Technician", "repairTime": "2.5 hrs", "cost": 1450 }`  
**Tables:** `quotation_line_items`

### `PUT /api/quotations/:id/line-items/:liId` — Update line item  
### `DELETE /api/quotations/:id/line-items/:liId` — Remove line item

### `POST /api/quotations/:id/updates`
**Purpose:** Technician / Workshop Controller / Parts Interpreter submits role update  
**Auth Roles:** Technician, WorkshopController, PartsInterpreter, PartsController  
**Request:**
```json
{
  "role": "Technician",
  "focusNote": "Brake repair estimate updated",
  "timeEta": "2.5 hours",
  "costImpact": 1450,
  "status": "Completed",
  "notes": "Front pads need replacement",
  "partLineItems": [
    { "oldPart": "Front brake pad set", "replacementPart": "OEM brake pad kit", "price": 980, "eta": "Available today", "replacementTime": "1.5 hours" }
  ]
}
```
**Tables:** `quotation_updates`, `part_line_items`

### `POST /api/quotations/:id/media`
**Purpose:** Upload diagnosis/evidence photos and videos  
**Content-Type:** multipart/form-data  
**Fields:** `files` (array), `mediaCategory` (diagnosis/failed_component/etc.)  
**Tables:** `quotation_media`

---

## 9. Customer Approval Portal (Public — token auth)

### `GET /api/portal/:token`
**Purpose:** Get quotation for customer review (public, no JWT)  
**Response:** Quote summary, line items, photos  
**Tables:** `quotations`, `quotation_line_items`, `quotation_media`

### `POST /api/portal/:token/approve`
**Request:** `{ "signature": "base64-signature-data" }`  
**Tables:** `quotations` (mark CustomerApproved), `notifications`

### `POST /api/portal/:token/reject`
**Request:** `{ "reason": "..." }`  
**Tables:** `quotations` (mark CustomerRejected), `notifications`

---

## 10. Job Cards / Kanban Board

### `GET /api/jobs`
**Purpose:** Kanban board data — jobs grouped by status  
**Query params:** `?workshopId=...&status=InProgress&technicianId=...`  
**Tables:** `job_cards`, `quotations`, `vehicles`, `users`

### `POST /api/jobs`
**Purpose:** Create job from approved quotation  
**Auth Roles:** FrontDesk  
**Request:**
```json
{
  "quotationId": "...",
  "assignedControllerId": "...",
  "assignedTechnicianId": "...",
  "department": "Service",
  "expectedStartDate": "2026-05-12",
  "deliveryPreference": "Collection"
}
```
**Tables:** `job_cards`, `job_checklist_items` (from template), `notifications`

### `GET /api/jobs/:id` — Full job with checklist, issues, media  
### `PUT /api/jobs/:id` — Update job  
### `PATCH /api/jobs/:id/status` — `{ "status": "InProgress" }`  
### `PATCH /api/jobs/:id/progress` — `{ "progress": 65 }`  
### `PATCH /api/jobs/:id/assign-technician` — `{ "technicianId": "..." }`  
### `PATCH /api/jobs/:id/assign-controller` — `{ "controllerId": "..." }`

### `PATCH /api/jobs/:id/qc-approve`
**Auth Roles:** Manager  
**Purpose:** Manager QC approval  
**Tables:** `job_cards` (qcApprovedAt, qcApprovedByUserId)

### `GET /api/jobs/:id/checklist` — Get checklist items  
### `POST /api/jobs/:id/checklist` — Update checklist item  
**Request:** `{ "itemId": "...", "state": "Completed", "color": "Green", "notes": "..." }`  
**Tables:** `job_checklist_items`

### `GET /api/jobs/:id/issues` — List technician issues  
### `POST /api/jobs/:id/issues`
**Request:** `{ "title": "Brake pad wear", "severity": "High", "note": "..." }`  
**Tables:** `job_issues`

### `PATCH /api/jobs/:id/issues/:issueId/resolve` — Mark issue resolved  
### `POST /api/jobs/:id/media` — Upload completion/evidence photos  
**Tables:** `job_media`

### `POST /api/jobs/:id/notify-customer`
**Purpose:** Send completion notification to customer  
**Request:** `{ "channel": "WhatsApp", "message": "Your vehicle is ready...", "sendTiming": "now" }`  
**Tables:** `notifications`

---

## 11. Parts (Parts Interpreter / Parts Controller)

### `GET /api/parts/queue` — Open quotations needing parts updates  
### `GET /api/parts/waiting` — Jobs with status WaitingParts  
### `POST /api/parts/line-items` — Add part line items  
### `PUT /api/parts/line-items/:id` — Update part line item  
### `DELETE /api/parts/line-items/:id` — Remove part line item  
### `POST /api/parts/line-items/:id/media` — Upload old/new part media  
**Tables:** `part_line_items`, `quotation_media`

---

## 12. Invoices (Accounts, Manager, CEO)

### `GET /api/invoices`
**Query params:** `?paymentStatus=Overdue&workshopId=...`  
**Tables:** `invoices`, `invoice_line_items`, `quotations`

### `POST /api/invoices`
**Purpose:** Generate invoice from approved quotation  
**Request:** `{ "quotationId": "..." }`  
**Tables:** `invoices`, `invoice_line_items`

### `GET /api/invoices/:id` — Full invoice with line items  
### `GET /api/invoices/:id/pdf` — Stream/download PDF

---

## 13. Payments (Accounts)

### `GET /api/payments`
**Query params:** `?status=Overdue&method=Card`  
**Tables:** `payments`, `invoices`

### `POST /api/payments`
**Request:**
```json
{
  "invoiceId": "...",
  "method": "MobileMoney",
  "amountReceived": 3080,
  "currency": "ZAR",
  "referenceNumber": "MM-120526-01",
  "notes": "Customer paid in full"
}
```
**Tables:** `payments`

### `GET /api/payments/:id` — Get payment  
### `PATCH /api/payments/:id/status` — `{ "status": "Paid" }`  
### `POST /api/payments/gateway-test` — Simulate gateway response (demo)

---

## 14. Reports (Accounts, CEO, Manager)

### `GET /api/reports/jobs`
**Query params:** `?workshopId=...&period=month`  
**Response:** Jobs created vs completed by month, completion rate  
**Tables:** `job_cards`

### `GET /api/reports/revenue`
**Response:** Revenue by month, approved quotation totals, paid records  
**Tables:** `invoices`, `payments`

### `GET /api/reports/technician-performance`
**Response:** Per technician — assigned, completed, avg hours, rework count, rating  
**Tables:** `job_cards`, `users`

### `GET /api/reports/pending-approvals-payments`
**Response:** Pending customer approvals + unpaid/overdue invoices  
**Tables:** `quotations`, `invoices`

### `GET /api/reports/export`
**Query params:** `?type=jobs&format=csv&workshopId=...&period=month`  
**Response:** CSV file download  

---

## 15. Notifications

### `GET /api/notifications` — Notification history  
### `POST /api/notifications/send` — Send ad-hoc notification  
**Request:** `{ "customerId": "...", "channel": "WhatsApp", "message": "...", "type": "JobCompleted" }`

### `GET /api/notifications/reminders` — Active reminder rules  
### `POST /api/notifications/reminders`
**Request:**
```json
{
  "quotationId": "...",
  "channel": "WhatsApp + Email",
  "firstReminderDelay": "2 hours after quote sent",
  "repeatFrequency": "Every 24 hours",
  "maxAttempts": 3,
  "stopCondition": "Approved or rejected",
  "messageTemplate": "Your quotation is awaiting approval..."
}
```
**Tables:** `approval_reminder_rules`

### `PUT /api/notifications/reminders/:id` — Update rule  
### `PATCH /api/notifications/reminders/:id/status` — `{ "status": "Paused" | "Active" }`  
### `DELETE /api/notifications/reminders/:id` — Delete rule  
### `POST /api/notifications/reminders/test` — Send test reminder

---

## 16. Settings / Enterprise Admin

### `GET /api/settings/modules` — All available modules  
### `GET /api/settings/service-templates` — Service templates with checklist items  
### `POST /api/settings/service-templates` — Create service template  
### `PUT /api/settings/service-templates/:id` — Update  
### `DELETE /api/settings/service-templates/:id` — Delete  
### `GET /api/settings/service-pricing` — Pricing per workshop/currency  
### `POST /api/settings/service-pricing` — Create/update standard price  
**Request:**
```json
{
  "serviceTemplateId": "...",
  "workshopId": null,
  "currency": "ZAR",
  "standardPrice": 3080,
  "customPrice": 3450,
  "allowCustomOverride": true,
  "effectiveFrom": "2026-05-12",
  "approvalRequired": "Manager",
  "taxIncluded": true
}
```

### `GET /api/settings/service-checklists` — Checklist templates  
### `POST /api/settings/service-checklists` — Add checklist item  
### `PUT /api/settings/service-checklists/:id` — Update item  
### `DELETE /api/settings/service-checklists/:id` — Remove item  
### `GET /api/settings/enterprise-admins` — List platform admin users  
### `POST /api/settings/enterprise-admins` — Create admin user  
### `PUT /api/settings/enterprise-admins/:id` — Update admin  
### `PATCH /api/settings/enterprise-admins/:id/status` — Activate/block  
### `GET /api/settings/login-activity` — Login activity audit log  
### `GET /api/settings/data-export` — Full workshop data export (CSV)

---

## Role-to-Route Access Matrix

| Role | Routes |
|---|---|
| Enterprise Admin | `/api/settings/*`, `/api/clients/*`, `/api/workshops/*`, `/api/users/*`, `/api/reports/*` |
| Front Desk | `/api/customers/*`, `/api/vehicles/*`, `/api/appointments/*`, `/api/quotations/*`, `/api/jobs (POST)`, `/api/notifications/*` |
| Technician | `/api/quotations/:id/updates`, `/api/jobs/:id/status`, `/api/jobs/:id/progress`, `/api/jobs/:id/checklist`, `/api/jobs/:id/issues`, `/api/jobs/:id/media` |
| Workshop Controller | `/api/jobs/:id/assign-technician`, `/api/jobs/:id/status`, `/api/workshops/:id/schedule`, `/api/quotations/:id/updates` |
| Manager | `/api/jobs/:id/qc-approve`, `/api/jobs/:id/issues/:id/resolve`, `/api/reports/*`, `/api/workshops/:id/schedule` |
| Accounts | `/api/invoices/*`, `/api/payments/*`, `/api/reports/*` |
| Parts Interpreter | `/api/parts/*`, `/api/quotations/:id/updates` |
| Parts Controller | Same as Parts Interpreter |
| CEO | `/api/reports/*`, `/api/ceo/*`, `/api/workshops/:id/schedule` |
| Public (token) | `/api/portal/:token/*` |
