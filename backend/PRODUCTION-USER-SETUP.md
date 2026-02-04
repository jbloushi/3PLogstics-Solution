# Production User Setup - Quick Reference

## 🚨 First Time Setup on Production

After deploying to production, you need to create users manually since seeding is disabled.

### **Fastest Method: Create Default Users**

```bash
cd /path/to/backend
npm run create-default-users
```

This creates:
- ✅ admin@demo.com / password123
- ✅ staff@demo.com / password123  
- ✅ client@demo.com / password123
- ✅ driver@demo.com / password123

**⚠️ IMPORTANT: Change these passwords immediately after first login!**

---

## 🔐 Production Best Practice

### Create Custom Admin User

```bash
npm run create-user
```

When prompted:
- Name: `Your Name`
- Email: `admin@yourcompany.com`
- Password: `[strong secure password]`
- Role: `1` (admin)
- Phone: `[your phone]`

---

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm run create-user` | Interactive single user creation |
| `npm run create-default-users` | Create all 4 default demo users |
| `npm run create-users myfile.json` | Batch create from JSON file |

---

## 🔍 Verify User Creation

After creating users, verify they exist:

```bash
# Connect to MongoDB shell
mongosh $MONGO_URI

# Check users
use your-database-name
db.users.find({}, {name: 1, email: 1, role: 1})
```

Or check via your application by attempting to login.

---

## ❓ Troubleshooting Login Issues

If you get "401 Unauthorized" or "Incorrect email or password":

1. **Verify user exists in database**
   ```bash
   npm run create-user
   # Enter the email to check if it prompts "User already exists"
   ```

2. **Reset password for existing user**
   ```bash
   npm run create-user
   # Enter same email, select 'yes' when asked to update
   ```

3. **Check database connection**
   - Verify `MONGO_URI` in `.env` is correct
   - Ensure MongoDB is accessible from production server

4. **Check application logs**
   ```bash
   tail -f logs/app.log
   # Look for authentication errors
   ```

---

## 🎯 Your Current Issue Solution

Based on your error message, run this on production:

```bash
# SSH to production VPS
ssh user@your-vps

# Navigate to backend
cd /path/to/Target-Logstics/backend

# Create the default users (includes admin@demo.com)
npm run create-default-users

# Or create just the admin user
USER_NAME="Admin User" \
USER_EMAIL="admin@demo.com" \
USER_PASSWORD="password123" \
USER_ROLE="admin" \
npm run create-user
```

Then try logging in again with:
- Email: `admin@demo.com`
- Password: `password123`

---

**Note**: These scripts are 100% safe - they never delete or modify existing production data!
