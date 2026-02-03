# Docker Deployment Guide

## 🐳 Container Architecture

This application uses Docker for containerization with the following services:
- **Backend API**: Node.js 18 Alpine with multi-stage build
- **MongoDB**: Official MongoDB 7 image
- **Frontend** (optional): React app served via Nginx

---

## 📋 Quick Start

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
docker --version  # Should be 20.10+
docker-compose --version  # Should be 1.29+ or 2.x
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.docker.example .env

# Edit environment variables
nano .env  # Or use your preferred editor
```

**Required Variables to Update**:
```env
# MongoDB
MONGO_ROOT_PASSWORD=<strong-password-here>

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<32-char-minimum>

# API Keys
DHL_API_KEY=<your-dhl-key>
DHL_API_SECRET=<your-dhl-secret>
GOOGLE_MAPS_API_KEY=<your-google-key>

# Production CORS
CORS_ORIGIN=https://yourdomain.com
```

### 3. Start Services
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 4. Verify Deployment
```bash
# Check backend health
curl http://localhost:5000/health
# Expected: {"status":"ok","database":"connected"}

# Check MongoDB connection
docker-compose exec mongodb mongosh -u admin -p changeme
```

---

## 🔧 Docker Commands

### Service Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (WARNING: deletes data)
docker-compose down -v
```

### Logs & Debugging
```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# View specific service logs
docker-compose logs backend
docker-compose logs mongodb

# View last 50 lines
docker-compose logs --tail=50
```

### Container Access
```bash
# Execute command in backend container
docker-compose exec backend sh

# Execute command in MongoDB
docker-compose exec mongodb mongosh -u admin -p <password>

# View backend environment variables
docker-compose exec backend env
```

### Image Management
```bash
# Rebuild images
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Pull latest images
docker-compose pull

# Remove unused images
docker image prune
```

---

## 📁 Volume Management

### Persistent Data Locations
- `mongodb_data` - MongoDB database files
- `mongodb_config` - MongoDB configuration
- `backend_uploads` - Uploaded files (shipping labels, invoices)
- `backend_logs` - Application logs (if LOG_TO_FILE=true)

### Backup Database
```bash
# Create backup
docker-compose exec mongodb mongodump --username admin --password <password> --authenticationDatabase admin --out /tmp/backup

# Copy backup from container
docker cp <container-id>:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore Database
```bash
# Copy backup to container
docker cp ./mongodb-backup mongodb:/tmp/restore

# Restore
docker-compose exec mongodb mongorestore --username admin --password <password> --authenticationDatabase admin /tmp/restore
```

---

## 🏗️ Production Deployment

### Using Docker Compose on VPS

1. **Install Docker on Server**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy Application**
```bash
# Clone repository
git clone <repo-url> /var/www/target-logistics
cd /var/www/target-logistics

# Setup environment
cp .env.docker.example .env
nano .env  # Configure production values

# Start services
docker-compose up -d

# Setup auto-start on reboot
sudo systemctl enable docker
```

3. **Nginx Reverse Proxy** (Optional but recommended)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔍 Health Checks

Docker health checks are configured for all services:

### Backend Health Check
```bash
# Manual check
docker-compose exec backend wget --no-verbose --spider http://localhost:5000/health

# View health status
docker inspect --format='{{.State.Health.Status}}' target-logistics-api
```

### MongoDB Health Check
```bash
# View health status
docker inspect --format='{{.State.Health.Status}}' target-logistics-mongodb
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Check logs**:
```bash
docker-compose logs backend
```

**Common Issues**:
- Missing environment variables (JWT_SECRET, DHL_API_KEY, etc.)
- MongoDB not ready (wait for health check)
- Port 5000 already in use (change BACKEND_PORT in .env)

### MongoDB Connection Failed

**Verify MongoDB is running**:
```bash
docker-compose ps mongodb
docker-compose logs mongodb
```

**Test connection**:
```bash
docker-compose exec mongodb mongosh -u admin -p <password>
```

### Container Keeps Restarting

**Check logs**:
```bash
docker-compose logs --tail=100 backend
```

**Common causes**:
- Application crash (check error logs)
- Failed health checks
- Missing dependencies

### Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :5000

# Linux
lsof -i :5000

# Change port in .env
BACKEND_PORT=5001
```

---

## 🔒 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` file to Git
- ✅ Use strong passwords (16+ characters)
- ✅ Generate cryptographically secure JWT_SECRET
- ✅ Restrict CORS_ORIGIN in production

### Container Security
- ✅ Containers run as non-root users
- ✅ Minimal Alpine base images
- ✅ Multi-stage builds (no dev dependencies in production)
- ✅ Health checks for monitoring

### Network Security
- ✅ Internal Docker network for service communication
- ✅ Only expose necessary ports
- ✅ Use reverse proxy (Nginx) for SSL/TLS

---

## 📊 Monitoring

### Container Resources
```bash
# View resource usage
docker stats

# View specific container
docker stats target-logistics-api
```

### Logs Aggregation
For production, consider:
- **Docker logging drivers**: json-file, syslog, journald
- **Log aggregation**: ELK Stack, Grafana Loki, CloudWatch

### Uptime Monitoring
- Configure external monitoring (UptimeRobot, Pingdom)
- Use health check endpoints

---

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Clean up old images
docker image prune
```

### Update Dependencies
```bash
# Rebuild with no cache
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [MongoDB in Docker](https://hub.docker.com/_/mongo)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Docker deployment is ready!** 🚀  
Your application is now containerized and production-ready.
