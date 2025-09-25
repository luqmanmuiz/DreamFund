# DreamFund Complete Setup Script for Windows
Write-Host "Setting up DreamFund Platform..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if MongoDB is installed
try {
    $mongoVersion = mongod --version
    Write-Host "MongoDB is available" -ForegroundColor Green
} catch {
    Write-Host "MongoDB not found. Please install MongoDB Community Server" -ForegroundColor Yellow
    Write-Host "Download from: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
}

# Install root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install

# Install server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Install client dependencies
Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

# Create uploads directory
Write-Host "Creating uploads directory..." -ForegroundColor Yellow
if (!(Test-Path "server/uploads")) {
    New-Item -ItemType Directory -Path "server/uploads"
}

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "   Admin:    http://localhost:3000/admin/login" -ForegroundColor White
Write-Host ""
Write-Host "Admin Credentials:" -ForegroundColor Cyan
Write-Host "   Email:    admin@dreamfund.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start MongoDB: mongod" -ForegroundColor White
Write-Host "   2. Seed admin user: cd server && npm run seed" -ForegroundColor White
Write-Host "   3. Start the app: npm run dev" -ForegroundColor White