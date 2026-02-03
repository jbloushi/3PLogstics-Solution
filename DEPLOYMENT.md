# Production Deployment Guide

This guide covers deploying the Target-Logistics application to a Linux Cloud VPS.

---

## 📋 Prerequisites

### Server Requirements
- **OS**: Linux (Ubuntu 20.04+ or similar)
- **Node.js**: v16.x or higher
- **MongoDB**: v4.4+ (cloud or self-hosted)
- **RAM**: Minimum 2GB recommended
- **Storage**: 10GB+ for application and logs
- **Firewall**: Ports 80, 443, and your app port (default: 5000)

### Required Accounts
- MongoDB Atlas account (or self-hosted MongoDB)
- DHL Express Developer Account
- Google Cloud Platform account (for Maps API)

---

## 🚀 Deployment Steps

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 2. Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone your repository
sudo git clone <your-repo-url> target-logistics
cd target-logistics

# Set proper permissions
sudo chown -R $USER:$USER /var/www/target-logistics
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install --production

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Required Environment Variables

```env
# CRITICAL: Update these values!
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cargo-tracker
JWT_SECRET=<generate-with-crypto-randomBytes-32-chars-minimum>
DHL_API_KEY=<your-dhl-api-key>
DHL_API_SECRET=<your-dhl-api-secret>
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>

# Production settings
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=info
LOG_TO_FILE=false

# Optional
SENTRY_DSN=<your-sentry-dsn>
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

Update `.env`:
```env
REACT_APP_API_URL=https://api.yourdomain.com/api
REACT_APP_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
SKIP_PREFLIGHT_CHECK=true
```

```bash
# Build production bundle
npm run build
```

### 5. Start Backend with PM2

```bash
cd ../backend

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command that PM2 outputs
```

**PM2 Commands:**
```bash
pm2 status              # Check app status
pm2 logs                # View logs
pm2 monit               # Monitor resources
pm2 restart all         # Restart app
pm2 reload all          # Zero-downtime reload
pm2 stop all            # Stop app
pm2 delete all          # Remove from PM2
```

### 6. Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create backend config
sudo nano /etc/nginx/sites-available/target-logistics-api
```

**Backend Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

**Frontend Nginx Configuration:**
```bash
sudo nano /etc/nginx/sites-available/target-logistics-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/target-logistics/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable sites:**
```bash
sudo ln -s /etc/nginx/sites-available/target-logistics-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/target-logistics-frontend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 7. SSL/TLS Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

### 8. Firewall Setup

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

---

## 🔍 Verification

### 1. Check Backend Health
```bash
curl https://api.yourdomain.com/health
# Expected: {"status":"ok","database":"connected"}
```

### 2. Check Frontend
```bash
curl https://yourdomain.com
# Should return HTML
```

### 3. Check PM2 Status
```bash
pm2 status
# Should show: target-logistics-api | online
```

### 4. Check Logs
```bash
pm2 logs --lines 50
# Check for errors
```

---

## 📊 Monitoring & Maintenance

### Log Management

**PM2 Logs:**
```bash
# View logs
pm2 logs

# Clear logs
pm2 flush

# Monitor in real-time
pm2 logs --lines 100 --timestamp
```

**Nginx Logs:**
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Backup

```bash
# MongoDB Atlas: Use automated backups in dashboard
# Self-hosted MongoDB:
mongodump --uri="mongodb://user:pass@host:27017/cargo-tracker" --out=/backup/$(date +%Y%m%d)
```

### Application Updates

```bash
cd /var/www/target-logistics

# Pull latest code
git pull origin main

# Backend update
cd backend
npm install --production
pm2 reload all

# Frontend update
cd ../frontend
npm install
npm run build
sudo systemctl reload nginx
```

---

## 🔒 Security Checklist

- [ ] Strong JWT_SECRET set (32+ characters)
- [ ] CORS_ORIGIN restricted to your domain
- [ ] Firewall configured (UFW)
- [ ] SSL/TLS certificates installed
- [ ] MongoDB authentication enabled
- [ ] API keys secured in environment variables
- [ ] Nginx security headers configured
- [ ] Regular system updates scheduled
- [ ] Backup strategy implemented
- [ ] PM2 process limits configured

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs --err

# Common issues:
# - Missing environment variables
# - MongoDB connection failed
# - Port already in use
```

### Database Connection Failed

```bash
# Check MongoDB URI format
# For Atlas: mongodb+srv://...
# For self-hosted: mongodb://...

# Test connection
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGO_URI').then(() => console.log('✅ Connected')).catch(e => console.error('❌', e))"
```

### CORS Errors

```bash
# Verify CORS_ORIGIN in .env
# Must match your frontend domain exactly
# Example: https://yourdomain.com (no trailing slash)
```

### 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check Nginx proxy settings
sudo nginx -t
sudo systemctl status nginx

# Check firewall
sudo ufw status
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 reload all

# Adjust max_memory_restart in ecosystem.config.js
```

---

## 📞 Support Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Let's Encrypt**: https://letsencrypt.org/docs/

---

## 🎯 Production Best Practices

1. **Environment Variables**: Never commit .env files to Git
2. **Logging**: Use centralized logging (e.g., CloudWatch, Papertrail)
3. **Monitoring**: Set up uptime monitoring (e.g., UptimeRobot)
4. **Backups**: Automate daily database backups
5. **Updates**: Schedule regular security updates
6. **Error Tracking**: Configure Sentry for error monitoring
7. **Load Balancing**: Consider multiple PM2 instances or Nginx upstream
8. **CDN**: Use CloudFlare or similar for static assets
9. **Database**: Use MongoDB Atlas for managed service
10. **Scaling**: Plan for horizontal scaling with Redis session store

---

**Congratulations!** 🎉 Your Target-Logistics application is now deployed and running in production.
