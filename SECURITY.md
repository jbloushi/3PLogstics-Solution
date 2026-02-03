# 🔒 SECURITY.md - Security Policy & Practices

## 🔑 API Key Management

### Generate API Keys
Authenticated users can generate API keys via:
```http
POST /api/auth/api-key
Authorization: Bearer <JWT_TOKEN>
```

### API Key Storage
- API keys are stored **hashed** in the database.
- Raw keys are only shown **once** upon generation.

### Rotation Policy
1. Generate a new API key via the endpoint above.
2. Update all clients to use the new key.
3. Delete the old key (via user settings or admin panel).

---

## 🛡️ Environment Variables

All sensitive configuration is managed via environment variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| `JWT_SECRET` | Token signing key | ✅ Yes |
| `DHL_API_KEY` | DHL Express API | ✅ Yes |
| `DHL_API_SECRET` | DHL Express API | ✅ Yes |
| `MONGO_ROOT_PASSWORD` | Database auth | ✅ Yes |
| `GOOGLE_MAPS_API_KEY` | Maps/Geocoding | Optional |

### Generation Instructions
```bash
# Generate a secure JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚨 Vulnerability Reporting

If you discover a security vulnerability, please report it to:
- **Email**: security@yourdomain.com
- **Do NOT** open a public GitHub issue.

We will respond within 48 hours.

---

## ✅ Security Checklist (Pre-Production)

- [ ] Change `MONGO_ROOT_PASSWORD` from default.
- [ ] Generate a 64+ character `JWT_SECRET`.
- [ ] Set `CORS_ORIGIN` to specific domains (not `*`).
- [ ] Switch DHL API to **production** URL.
- [ ] Enable HTTPS/TLS on all endpoints.
- [ ] Restrict `/api/geocode/*` with rate-limiting.
- [ ] Review public shipment routes for data exposure.
