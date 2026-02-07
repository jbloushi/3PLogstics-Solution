# 🔄 Updating Production on aaPanel VPS

This guide provides step-by-step instructions for pulling the latest code and rebuilding your 3PLogistics-Solution deployment on an aaPanel VPS **without affecting your production database**.

---

## 📋 Prerequisites

- SSH access to your VPS
- aaPanel installed and configured
- Application deployed at `/www/wwwroot/3pl.mawthook.io/`
- PM2 running the backend process
- Nginx configured as reverse proxy

---

## 🚀 Quick Update

### Option A: Automatic Update (Recommended)

Use the deployment script to automate the entire process:

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Run the deployment script
bash /www/wwwroot/3pl.mawthook.io/deploy.sh
```

### Option B: Manual Update

If you prefer to run commands manually:

```bash
# Navigate to project directory
cd /www/wwwroot/3pl.mawthook.io

# Pull latest code
git pull origin master

# Update backend
cd backend && npm install --production && pm2 restart 3pl-backend

# Update frontend
cd ../frontend && npm install && npm run build
rm -rf ../site/* && cp -r build/* ../site/

# Reload nginx
nginx -s reload
```

---

## 📖 Detailed Step-by-Step Guide

### Step 1: Backup Current State (Optional but Recommended)

```bash
# Create backup directory
mkdir -p ~/backups/3pl-$(date +%Y%m%d)

# Backup current frontend build
cp -r /www/wwwroot/3pl.mawthook.io/site ~/backups/3pl-$(date +%Y%m%d)/

# Backup .env files (IMPORTANT - contains your credentials)
cp /www/wwwroot/3pl.mawthook.io/backend/.env ~/backups/3pl-$(date +%Y%m%d)/backend.env
```

### Step 2: Pull Latest Code

```bash
cd /www/wwwroot/3pl.mawthook.io

# Check current status
git status

# Stash any local changes (if needed)
git stash

# Pull latest from GitHub
git pull origin master

# If you stashed changes, reapply them
# git stash pop
```

### Step 3: Update Backend

```bash
cd /www/wwwroot/3pl.mawthook.io/backend

# Install new dependencies
npm install --production

# Check PM2 process name
pm2 list

# Restart backend (replace '3pl-backend' with your actual PM2 app name)
pm2 restart 3pl-backend

# Verify backend is running
pm2 logs 3pl-backend --lines 50

# Test backend health
curl http://localhost:8899/health
# Expected: {"status":"ok","database":"connected"}
```

### Step 4: Update Frontend

```bash
cd /www/wwwroot/3pl.mawthook.io/frontend

# Install new dependencies
npm install

# Build for production
npm run build

# Remove old build from nginx root
rm -rf /www/wwwroot/3pl.mawthook.io/site/*

# Copy new build to nginx root
cp -r build/* /www/wwwroot/3pl.mawthook.io/site/

# Set correct permissions
chown -R www:www /www/wwwroot/3pl.mawthook.io/site
chmod -R 755 /www/wwwroot/3pl.mawthook.io/site
```

### Step 5: Reload Nginx

```bash
# Test nginx configuration
nginx -t

# If test passes, reload nginx
nginx -s reload

# Or restart nginx if reload doesn't work
systemctl restart nginx
```

### Step 6: Verify Deployment

```bash
# Check backend health
curl http://localhost:8899/health

# Check frontend is accessible
curl -I https://3pl.mawthook.io

# Check PM2 status
pm2 status

# View backend logs
pm2 logs 3pl-backend --lines 100
```

---

## 🗄️ Database Safety

**Your MongoDB database is NOT affected by updates** because:

1. The database runs separately (either in Docker or as a system service)
2. Code updates only affect application files, not data
3. The `MONGO_URI` in your `.env` file remains unchanged

**Important:** Never delete or modify:
- `/www/wwwroot/3pl.mawthook.io/backend/.env` (contains your database credentials)
- Your MongoDB data directory
- Docker volumes (if using Docker for MongoDB)

---

## 🔧 Troubleshooting

### Backend Won't Start After Update

```bash
# Check PM2 logs for errors
pm2 logs 3pl-backend --err --lines 100

# Common fixes:
# 1. Missing dependencies
cd /www/wwwroot/3pl.mawthook.io/backend
npm install --production

# 2. Port already in use
lsof -i :8899
# Kill the process if needed, then restart PM2

# 3. Environment variables missing
cat /www/wwwroot/3pl.mawthook.io/backend/.env
# Ensure all required variables are set
```

### Frontend Shows Old Version

```bash
# Clear browser cache or test in incognito mode

# Verify build was copied correctly
ls -la /www/wwwroot/3pl.mawthook.io/site/

# Check nginx is serving the right directory
nginx -T | grep "root"

# Force rebuild
cd /www/wwwroot/3pl.mawthook.io/frontend
rm -rf build node_modules
npm install
npm run build
cp -r build/* /www/wwwroot/3pl.mawthook.io/site/
```

### Git Pull Fails

```bash
# If you have local changes
git stash
git pull origin master
git stash pop

# If you get merge conflicts
git reset --hard origin/master
# WARNING: This discards all local changes!

# If .env files are causing issues
git update-index --assume-unchanged backend/.env
git update-index --assume-unchanged frontend/.env
```

### Database Connection Issues

```bash
# Check MongoDB is running
systemctl status mongod
# Or if using Docker:
docker ps | grep mongo

# Test connection from backend
cd /www/wwwroot/3pl.mawthook.io/backend
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGO_URI || 'your-mongo-uri').then(() => console.log('Connected!')).catch(err => console.error(err));"
```

---

## 🔄 PM2 Process Management

### Common PM2 Commands

```bash
# List all processes
pm2 list

# Restart backend
pm2 restart 3pl-backend

# Stop backend
pm2 stop 3pl-backend

# Start backend
pm2 start 3pl-backend

# View logs
pm2 logs 3pl-backend

# Monitor resources
pm2 monit

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### If PM2 Process Doesn't Exist

```bash
cd /www/wwwroot/3pl.mawthook.io/backend

# Start with PM2
pm2 start npm --name "3pl-backend" -- start

# Or use ecosystem file if it exists
pm2 start ecosystem.config.js

# Save the process
pm2 save
```

---

## 📝 Update Checklist

Before updating:
- [ ] Backup current `.env` files
- [ ] Note current PM2 process name (`pm2 list`)
- [ ] Verify database is accessible
- [ ] Check disk space (`df -h`)

During update:
- [ ] Pull latest code (`git pull origin master`)
- [ ] Update backend dependencies (`npm install --production`)
- [ ] Restart PM2 process
- [ ] Rebuild frontend (`npm run build`)
- [ ] Copy build to nginx root
- [ ] Reload nginx

After update:
- [ ] Test backend health endpoint
- [ ] Test frontend loads correctly
- [ ] Check PM2 logs for errors
- [ ] Verify database connectivity
- [ ] Test critical features (login, create shipment, etc.)

---

## 🆘 Emergency Rollback

If something goes wrong:

```bash
# Stop backend
pm2 stop 3pl-backend

# Restore previous frontend build
rm -rf /www/wwwroot/3pl.mawthook.io/site/*
cp -r ~/backups/3pl-YYYYMMDD/* /www/wwwroot/3pl.mawthook.io/site/

# Restore .env if needed
cp ~/backups/3pl-YYYYMMDD/backend.env /www/wwwroot/3pl.mawthook.io/backend/.env

# Rollback code
cd /www/wwwroot/3pl.mawthook.io
git log --oneline -10  # Find previous commit
git reset --hard <commit-hash>

# Reinstall dependencies
cd backend && npm install --production

# Restart
pm2 restart 3pl-backend
nginx -s reload
```

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs 3pl-backend`
3. Check nginx error logs: `tail -f /www/wwwlogs/3pl.mawthook.io.error.log`
4. Verify `.env` configuration matches production requirements

---

**Last Updated:** 2026-02-05  
**For:** aaPanel VPS Deployment
