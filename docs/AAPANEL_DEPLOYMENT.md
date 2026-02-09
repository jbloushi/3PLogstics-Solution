# � Target Logistics: aaPanel & Docker Deployment Guide

This guide covers both **Fresh Installations** (first-time setup) and **Updating Existing Deployments** on an aaPanel VPS.

---

## 🆕 Fresh Installation (First-Time Setup)

Use this section if you are setting up the solution for the first time on a new server.

### � 1. Host Preparation

1.  **Install Docker**: Ensure Docker and Docker Compose are installed on your VPS.
    ```bash
    # Check if docker is installed
    docker --version
    docker-compose --version
    ```
2.  **Install Git**:
    ```bash
    sudo apt update && sudo apt install git -y
    ```

### 📂 2. Clone repository

```bash
cd /www/wwwroot
git clone https://github.com/jbloushi/3PLogstics-Solution.git 3pl.mawthook.io
cd 3pl.mawthook.io
```

### 🔐 3. Environment Configuration

1.  **Create Root .env**: Copy the template and update values.
    ```bash
    cp .env.docker.example .env
    nano .env
    ```
    > [!IMPORTANT]
    > **Required Changes in `.env`:**
    > - `MONGO_ROOT_PASSWORD`: Set a strong password.
    > - `JWT_SECRET`: Generate a random 64-character hex string.
    > - `GOOGLE_MAPS_API_KEY`: Required for tracking and address features.
    > - `DHL_API_KEY` & `DHL_API_SECRET`: Required for shipping labels.

### 🐳 4. Deploy Stack (Docker)

Launch the entire stack (MongoDB + Backend API):

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker ps
# You should see: target-logistics-api, target-logistics-mongodb
```

### 👤 5. Initial User Setup

Since this is a fresh install, the database is empty. You **must** create the initial users:

```bash
# Run the seeding script inside the backend container
docker exec -it target-logistics-api npm run create-default-users
```
> [!NOTE]
> This creates default accounts like `admin@demo.com`. See [PRODUCTION-USER-SETUP.md](../backend/PRODUCTION-USER-SETUP.md) for details.

### 🌐 6. Nginx & aaPanel Configuration

1.  **Create Website in aaPanel**: Create `3pl.mawthook.io` with "Pure Python" or "Static" (we only need the Nginx config).
2.  **Point Site Root**: Ensure it points to `/www/wwwroot/3pl.mawthook.io/site`.
3.  **Build Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    mkdir -p ../site
    cp -r build/* ../site/
    ```
4.  **Edit Nginx Config**: In aaPanel -> Website -> Settings -> Config:
    ```nginx
    location / {
        root /www/wwwroot/3pl.mawthook.io/site;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8899;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_cache_bypass $http_upgrade;
    }
    ```

---

## � Updating an Existing Deployment

Use this section for routine updates when the database is already running.

### � Quick Update (Automatic)

```bash
# SSH into your VPS and run:
bash /www/wwwroot/3pl.mawthook.io/deploy.sh
```

### 📖 Manual Update Steps

1.  **Pull Latest Code**:
    ```bash
    cd /www/wwwroot/3pl.mawthook.io
    git pull origin master
    ```

2.  **Update API (Docker)**:
    If there are backend changes, rebuild the image:
    ```bash
    docker-compose up -d --build backend
    ```

3.  **Update Frontend**:
    ```bash
    cd frontend
    npm install
    npm run build
    rm -rf ../site/*
    cp -r build/* ../site/
    ```

4.  **Reload Nginx**:
    ```bash
    systemctl reload nginx
    ```

---

## �️ Database Management

**Docker MongoDB Details:**
- **Data Persistence**: Stored in Docker volume `target-logistics-mongodb-data`.
- **Backups**: Data is preserved even if containers are destroyed, as long as the volume is not deleted.

---

## 🔧 Troubleshooting

### Check API Health
```bash
curl http://localhost:8899/health
# Expected: {"status":"ok","database":"connected"}
```

### View Logs
```bash
docker logs -f target-logistics-api
```

---

## ⚠️ Common Mistakes

### ❌ Running Backend on Host AND Docker
If you see an error like `Port 8899 already in use` or your `nodemon` crashes with `Missing environment variables`, it's likely because you are trying to run `npm run dev` on the host while the Docker container is already running.

**Solution:**
1. Stop any manual Node processes (Ctrl+C).
2. Use the Docker container: `docker logs -f target-logistics-api`.
3. If you *must* run on host, stop Docker first: `docker-compose stop backend`.

---

**Last Updated:** 2026-02-09  
**Target:** aaPanel VPS / Docker Deployment
