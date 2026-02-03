# 🗺️ PROJECT_MAP.md - Route & Security Reference

> Auto-generated Security Audit Document

## 📊 Route Security Matrix

| Endpoint | Method | Auth Level | Notes |
|----------|--------|------------|-------|
| `/health` | GET | 🔓 Public | Health check |
| `/` | GET | 🔓 Public | API info |
| --- | --- | --- | --- |
| **Auth Routes** |
| `/api/auth/login` | POST | 🔓 Public | Login |
| `/api/auth/register` | POST | 🔓 Public | Registration |
| `/api/auth/api-key` | POST | 🔒 JWT | Generate API key |
| `/api/auth/users` | GET | 🔒 Staff/Admin | User list |
| `/api/auth/clients` | GET | 🔒 Staff/Admin | Client list |
| --- | --- | --- | --- |
| **Shipment Routes** |
| `/api/shipments/public/:id` | GET | 🔓 Public | ⚠️ Public tracking |
| `/api/shipments/public/:id/location` | PATCH | 🔓 Public | ⚠️ Public location update |
| `/api/shipments/` | GET | 🔒 JWT | All shipments |
| `/api/shipments/` | POST | 🔒 JWT | Create shipment |
| `/api/shipments/:id/dhl` | POST | 🔒 JWT | Submit to DHL |
| ... | ... | 🔒 JWT | (All other routes protected) |
| --- | --- | --- | --- |
| **Geocode Routes** |
| `/api/geocode/autocomplete` | GET | 🔓 Public | ⚠️ Google API proxy |
| `/api/geocode/details/:placeId` | GET | 🔓 Public | ⚠️ Google API proxy |
| `/api/geocode/validate` | POST | 🔓 Public | ⚠️ Google API proxy |
| `/api/geocode/normalize` | POST | 🔓 Public | Address normalization |
| --- | --- | --- | --- |
| **External API (Machine-to-Machine)** |
| `/api/v1/*` | ALL | 🔑 API Key | Partner integrations |
| `/api/client/*` | ALL | 🔑 API Key | Legacy client API |
| --- | --- | --- | --- |
| **Protected Routes** |
| `/api/users/*` | ALL | 🔒 JWT | User management |
| `/api/organizations/*` | ALL | 🔒 JWT | Org management |
| `/api/finance/*` | ALL | 🔒 JWT | Billing/invoices |
| `/api/pickups/*` | ALL | 🔒 JWT | Driver pickups |
| `/api/receivers/*` | ALL | 🔒 JWT | Address book |

---

## 🔐 Security Legend

| Symbol | Meaning |
|--------|---------|
| 🔓 Public | No authentication required |
| 🔒 JWT | Requires valid JWT token |
| 🔑 API Key | Requires API key header (`X-API-Key`) |
| ⚠️ | Potential security concern |

---

## 📝 Notes

- **Public Shipment Routes**: Allow end-customers to view and update location. Protected by `shipment.allowPublicLocationUpdate` flag.
- **Geocode Routes**: Serve as a proxy to Google Maps API. Consider rate-limiting to prevent abuse.
- **DHL Integration**: Currently uses `https://express.api.dhl.com/mydhlapi/test` (SANDBOX). Switch to production URL before go-live.
