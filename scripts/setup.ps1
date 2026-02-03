# ========================================
# 3PLogistics-Solution Setup Script (Windows)
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting 3PLogistics-Solution Setup..." -ForegroundColor Cyan

# 1. Check for Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Setup Environment File
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env from template..." -ForegroundColor Yellow
    Copy-Item .env.docker.example .env
    
    # Generate a fresh JWT_SECRET
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    $envContent = Get-Content .env
    $envContent = $envContent -replace "your-super-secret-jwt-key-change-this-min-32-chars-required", $jwtSecret
    $envContent | Set-Content .env
    
    Write-Host "✅ .env file created with fresh JWT_SECRET." -ForegroundColor Green
} else {
    Write-Host "ℹ️  .env file already exists. Skipping creation." -ForegroundColor Blue
}

# 3. Pull/Build and Start
Write-Host "🐳 Starting Docker containers..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "----------------------------------------" -ForegroundColor White
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "📡 Backend: http://localhost:8899" -ForegroundColor White
Write-Host "🏥 Health:  http://localhost:8899/health" -ForegroundColor White
Write-Host "----------------------------------------" -ForegroundColor White
