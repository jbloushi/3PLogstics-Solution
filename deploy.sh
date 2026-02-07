#!/bin/bash

# 🚀 3PLogistics-Solution Deployment Script
# This script automates the pull, build, and restart process on the aaPanel VPS.

# --- Configuration ---
PROJECT_ROOT="/www/wwwroot/3pl.mawthook.io"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
BACKEND_DIR="$PROJECT_ROOT/backend"
NGINX_SITE_DIR="/www/wwwroot/3pl.mawthook.io/site"
PM2_PROCESS_NAME="3pl-backend"

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Deployment ===${NC}"

# Navigate to project root
cd $PROJECT_ROOT || { echo -e "${RED}Error: Project root not found${NC}"; exit 1; }

# Pull latest code
echo -e "${BLUE}1. Pulling latest code from GitHub...${NC}"
git pull origin master || { echo -e "${RED}Error: git pull failed${NC}"; exit 1; }

# Update Backend
echo -e "${BLUE}2. Updating Backend...${NC}"
cd $BACKEND_DIR
npm install --production || { echo -e "${RED}Error: backend npm install failed${NC}"; exit 1; }
pm2 restart $PM2_PROCESS_NAME || { echo -e "${RED}Warning: Failed to restart PM2 process $PM2_PROCESS_NAME. Attempting to start...${NC}"; pm2 start npm --name "$PM2_PROCESS_NAME" -- start; }

# Update Frontend
echo -e "${BLUE}3. Updating Frontend...${NC}"
cd $FRONTEND_DIR
npm install || { echo -e "${RED}Error: frontend npm install failed${NC}"; exit 1; }
npm run build || { echo -e "${RED}Error: frontend build failed${NC}"; exit 1; }

# Copy build to nginx root
echo -e "${BLUE}4. Refreshing Nginx static files...${NC}"
rm -rf $NGINX_SITE_DIR/*
cp -r build/* $NGINX_SITE_DIR/

# Set permissions
chown -R www:www $NGINX_SITE_DIR
chmod -R 755 $NGINX_SITE_DIR

# Reload Nginx
echo -e "${BLUE}5. Reloading Nginx...${NC}"
nginx -t && nginx -s reload

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${BLUE}Check status with: pm2 status${NC}"
