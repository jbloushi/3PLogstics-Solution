# User Management Scripts

This directory contains production-safe scripts for managing users without affecting existing data or seeding logic.

## 🎯 Overview

These scripts allow you to create users on production environments without running the full seeding process, ensuring your production data remains intact.

## 📁 Files

- **`create-user.js`** - Interactive script to create a single user
- **`batch-create-users.js`** - Script to create multiple users from a JSON file
- **`users.example.json`** - Example JSON file with default users

## 🚀 Quick Start

### Option 1: Create Default Users (Recommended for first-time setup)

```bash
npm run create-default-users
```

This will create the following users:
- **admin@demo.com** / password123 (admin)
- **staff@demo.com** / password123 (staff)
- **client@demo.com** / password123 (client)
- **driver@demo.com** / password123 (driver)

### Option 2: Create Single User (Interactive)

```bash
npm run create-user
```

You'll be prompted to enter:
- Full name
- Email address
- Password (minimum 8 characters)
- Role (admin, staff, client, driver)
- Phone number (optional)

### Option 3: Create Single User (Environment Variables)

```bash
USER_NAME="John Doe" USER_EMAIL="john@example.com" USER_PASSWORD="securepass123" USER_ROLE="client" npm run create-user
```

### Option 4: Create Users from Custom JSON File

1. Create your JSON file (e.g., `production-users.json`):

```json
[
  {
    "name": "Production Admin",
    "email": "admin@mycompany.com",
    "password": "SecurePassword123!",
    "role": "admin",
    "phone": "96512345678"
  },
  {
    "name": "Operations Manager",
    "email": "ops@mycompany.com",
    "password": "SecurePassword456!",
    "role": "staff",
    "phone": "96587654321"
  }
]
```

2. Run the batch script:

```bash
npm run create-users scripts/production-users.json
```

Or directly:

```bash
node scripts/batch-create-users.js /path/to/your/users.json
```

## 🔐 User Roles

| Role | Description |
|------|-------------|
| **admin** | Full system access, can manage all resources |
| **staff** | Operations staff, can process shipments and manage clients |
| **client** | Customer role, can create and track shipments |
| **driver** | Delivery driver, can scan and update pickup status |

## ⚙️ Environment Configuration

These scripts automatically use your `.env` file to connect to MongoDB. Make sure your production environment has:

```env
MONGO_URI=mongodb://your-production-db-url
```

## 🛡️ Safety Features

✅ **Non-destructive**: Scripts never delete or modify existing data (except when explicitly updating users)

✅ **Duplicate detection**: Automatically detects existing users and prompts for confirmation before updating

✅ **Validation**: Validates all required fields and password strength

✅ **Organization linking**: Automatically links clients to the default organization if it exists

✅ **Independent of seeding**: These scripts don't interfere with your seeding logic or production data

## 📝 Examples

### Create a new admin user on production

```bash
# SSH into your production server
ssh user@your-vps

# Navigate to backend directory
cd /path/to/backend

# Run the interactive script
npm run create-user

# Follow the prompts:
# Name: Production Admin
# Email: admin@yourcompany.com
# Password: [enter secure password]
# Role: 1 (admin)
# Phone: [optional]
```

### Batch create users for a new deployment

```bash
# Create your users file
cat > scripts/new-deployment-users.json << 'EOF'
[
  {
    "name": "System Administrator",
    "email": "admin@company.com",
    "password": "ChangeMe123!",
    "role": "admin"
  },
  {
    "name": "Support Team",
    "email": "support@company.com",
    "password": "Support123!",
    "role": "staff"
  }
]
EOF

# Run batch creation
npm run create-users scripts/new-deployment-users.json
```

### Update an existing user's password

```bash
# Run create-user with existing email
npm run create-user

# When prompted with "User already exists, update?", type 'yes'
# This will update the password and role
```

## 🔍 Troubleshooting

### "User already exists" error

The script detects existing users and will ask if you want to update them. Type `yes` to update or `no` to cancel.

### "MongoDB connection error"

Check your `.env` file and ensure `MONGO_URI` is correctly set. Also verify network connectivity to your database.

### "Password must be at least 8 characters"

Ensure passwords meet the minimum length requirement (8 characters).

### Invalid role

Make sure the role is one of: `admin`, `staff`, `client`, or `driver`.

## 🎓 Best Practices

1. **Use strong passwords** on production environments
2. **Keep user JSON files secure** - add them to `.gitignore` if they contain real credentials
3. **Test locally first** before running on production
4. **Document user creation** - keep a record of which users were created and when
5. **Change default passwords** immediately after creation

## 🔒 Security Notes

- Passwords are automatically hashed using bcrypt before storage
- Never commit files containing production passwords to version control
- Consider using environment variables for sensitive data
- Regularly rotate passwords for admin and staff accounts

## 📞 Support

If you encounter issues:

1. Check MongoDB connection and credentials
2. Verify the user data format in JSON files
3. Review the error messages - they provide specific guidance
4. Check the logs for detailed error information

---

**Last Updated**: 2026-02-04
