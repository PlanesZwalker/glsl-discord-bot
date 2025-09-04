# Script de Deploiement Vercel pour GLSL Discord Bot (Windows)
# Usage: .\deploy-vercel.ps1

Write-Host "Deploiement Vercel pour GLSL Discord Bot..." -ForegroundColor Green

# Verifier que Vercel CLI est installe
try {
    $vercelVersion = vercel --version
    Write-Host "Vercel CLI trouve: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "Vercel CLI non trouve. Installation..." -ForegroundColor Yellow
    npm install -g vercel
}

# Verifier que .env existe
if (-not (Test-Path ".env")) {
    Write-Host "Fichier .env manquant !" -ForegroundColor Red
    Write-Host "Creez un fichier .env avec :" -ForegroundColor Yellow
    Write-Host "DISCORD_TOKEN=votre_token_discord" -ForegroundColor Cyan
    Write-Host "DISCORD_CLIENT_ID=votre_client_id" -ForegroundColor Cyan
    exit 1
}

# Nettoyer les dossiers non necessaires
Write-Host "Nettoyage des dossiers de developpement..." -ForegroundColor Yellow
if (Test-Path "logs") { Remove-Item -Recurse -Force "logs" }
if (Test-Path "output") { Remove-Item -Recurse -Force "output" }
if (Test-Path "data\*.db") { Remove-Item -Force "data\*.db" }

# Installer les dependances
Write-Host "Installation des dependances..." -ForegroundColor Yellow
npm install --production

# Deployer sur Vercel
Write-Host "Deploiement sur Vercel..." -ForegroundColor Green
vercel --prod

Write-Host "Deploiement termine !" -ForegroundColor Green
Write-Host "Votre bot est maintenant en ligne sur Vercel !" -ForegroundColor Cyan
