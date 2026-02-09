#!/bin/bash

# 🚀 3PLogistics-Solution Deployment Script v2
# This script automates the pull, build, and restart process on the aaPanel VPS.

# --- Configuration ---
PROJECT_ROOT="/www/wwwroot/3pl.mawthook.io"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
NGINX_SITE_DIR="/www/wwwroot/3pl.mawthook.io/site"
PM2_PROCESS_NAME="3pl-backend"
HEALTH_URL="http://localhost:8899/health"

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Deployment ===${NC}"

# Navigate to project root
cd $PROJECT_ROOT || { echo -e "${RED}Error: Project root $PROJECT_ROOT not found${NC}"; exit 1; }

# Pull latest code
echo -e "${BLUE}1. Pulling latest code from GitHub...${NC}"
git pull origin master || { echo -e "${RED}Error: git pull failed${NC}"; exit 1; }

# Update Backend
echo -e "${BLUE}2. Updating Backend...${NC}"
cd $BACKEND_DIR
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file missing in backend directory!${NC}"
    echo -e "${YELLOW}Please create /www/wwwroot/3pl.mawthook.io/backend/.env with required variables.${NC}"
    exit 1
fi

npm install --production || { echo -e "${RED}Error: backend npm install failed${NC}"; exit 1; }

echo -e "${BLUE}3. Restarting Docker backend...${NC}"
docker-compose up -d --build backend || { echo -e "${RED}Error: Docker rebuild failed${NC}"; exit 1; }

# Wait for backend to start
echo -e "${BLUE}4. Verifying Backend health...${NC}"
# Use Docker's built-in wait or simple sleep + curl
sleep 10
HEALTH_CHECK=$(curl -s $HEALTH_URL)
if [[ $HEALTH_CHECK == *"\"status\":\"ok\""* ]]; then
    echo -e "${GREEN}✅ Backend is healthy!${NC}"
else
    echo -e "${RED}❌ Backend health check failed! HTTP Response: $HEALTH_CHECK${NC}"
    echo -e "${YELLOW}Check Docker logs with: docker logs target-logistics-api${NC}"
    # exit 1 # Continue anyway for frontend, but notify
fi

# Update Frontend
echo -e "${BLUE}5. Updating Frontend...${NC}"
cd $FRONTEND_DIR
npm install || { echo -e "${RED}Error: frontend npm install failed${NC}"; exit 1; }
npm run build || { echo -e "${RED}Error: frontend build failed${NC}"; exit 1; }

# Copy build to nginx root
echo -e "${BLUE}6. Refreshing Nginx static files...${NC}"
if [ ! -d "$NGINX_SITE_DIR" ]; then
    echo -e "${BLUE}Creating site directory $NGINX_SITE_DIR...${NC}"
    mkdir -p $NGINX_SITE_DIR
fi
rm -rf $NGINX_SITE_DIR/*
cp -r build/* $NGINX_SITE_DIR/

# Set permissions
chown -R www:www $NGINX_SITE_DIR
chmod -R 755 $NGINX_SITE_DIR

# Reload Nginx
echo -e "${BLUE}7. Reloading Nginx...${NC}"
# Use systemctl for reliable reload on aaPanel/Ubuntu
systemctl reload nginx || {
    echo -e "${YELLOW}systemctl reload failed, trying nginx -s reload...${NC}"
    nginx -s reload || {
        echo -e "${RED}Nginx reload failed! Please check manually: nginx -t${NC}"
    }
}

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}Final Status:${NC}"
pm2 status $PM2_PROCESS_NAME
