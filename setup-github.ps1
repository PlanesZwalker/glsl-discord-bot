# Script de Configuration GitHub pour GLSL Discord Bot
# Usage: .\setup-github.ps1

Write-Host "🚀 Configuration GitHub pour GLSL Discord Bot" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Demander le nom d'utilisateur GitHub
$githubUsername = Read-Host "Entrez votre nom d'utilisateur GitHub"

if (-not $githubUsername) {
    Write-Host "❌ Nom d'utilisateur GitHub requis !" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Nom d'utilisateur: $githubUsername" -ForegroundColor Green

# Créer l'URL du repository
$repoUrl = "https://github.com/$githubUsername/glsl-discord-bot.git"

Write-Host "🔗 URL du repository: $repoUrl" -ForegroundColor Cyan

# Ajouter l'origine distante
Write-Host "📡 Ajout de l'origine distante..." -ForegroundColor Yellow
git remote add origin $repoUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Origine distante ajoutée" -ForegroundColor Green
} else {
    Write-Host "⚠️ L'origine distante existe peut-être déjà" -ForegroundColor Yellow
}

# Vérifier l'origine
Write-Host "🔍 Vérification de l'origine..." -ForegroundColor Yellow
git remote -v

# Instructions pour l'utilisateur
Write-Host ""
Write-Host "🎯 PROCHAINES ÉTAPES:" -ForegroundColor Magenta
Write-Host "=====================" -ForegroundColor Magenta
Write-Host ""
Write-Host "1. 🌐 Allez sur GitHub.com et créez un repository PUBLIC nommé 'glsl-discord-bot'" -ForegroundColor White
Write-Host "2. 📝 Description: 'Bot Discord professionnel pour compiler et animer des shaders GLSL en temps réel avec WebGL'" -ForegroundColor White
Write-Host "3. ❌ NE PAS initialiser avec README, .gitignore, ou LICENSE" -ForegroundColor White
Write-Host "4. 🚀 Cliquez sur 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "5. 💻 Poussez le code avec:" -ForegroundColor Cyan
Write-Host "   git push -u origin master" -ForegroundColor White
Write-Host ""
Write-Host "6. 🔄 Redéployez sur Vercel depuis GitHub" -ForegroundColor Cyan
Write-Host ""
Write-Host "7. 🧪 Testez l'endpoint Discord:" -ForegroundColor Cyan
Write-Host "   https://glsl-discord-8sjygh0o5-annjs-projects.vercel.app/discord" -ForegroundColor White
Write-Host ""

Write-Host "✅ Configuration GitHub terminée !" -ForegroundColor Green
Write-Host "📚 Consultez GITHUB_SETUP.md pour plus de détails" -ForegroundColor Cyan
