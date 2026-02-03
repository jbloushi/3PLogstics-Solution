#!/bin/bash

# ========================================
# Target-Logistics Setup Script (Linux)
# ========================================

set -e

echo "🚀 Starting Target-Logistics Setup..."

# 1. Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: Docker is not installed." >&2
  exit 1
fi

# 2. Setup Environment File
if [ ! -f .env ]; then
  echo "📝 Creating .env from template..."
  cp .env.docker.example .env
  
  # Generate a fresh JWT_SECRET
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i "s/your-super-secret-jwt-key-change-this-min-32-chars-required/$JWT_SECRET/g" .env
  
  echo "✅ .env file created with fresh JWT_SECRET."
else
  echo "ℹ️  .env file already exists. Skipping creation."
fi

# 3. Pull/Build and Start
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "----------------------------------------"
echo "✅ Setup Complete!"
echo "📡 Backend: http://localhost:8899"
echo "🏥 Health:  http://localhost:8899/health"
echo "----------------------------------------"
