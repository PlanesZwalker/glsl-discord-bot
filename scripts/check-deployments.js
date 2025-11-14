#!/usr/bin/env node

/**
 * Script to check if Vercel and Render.com deployments are up to date
 * Usage: node scripts/check-deployments.js
 */

const { execSync } = require('child_process');
const https = require('https');

// Get the latest commit hash
const latestCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
const latestCommitShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
const latestCommitMessage = execSync('git log -1 --pretty=format:"%s"', { encoding: 'utf-8' }).trim();

console.log('📊 Deployment Status Check\n');
console.log('═'.repeat(60));
console.log(`📝 Latest Local Commit: ${latestCommitShort}`);
console.log(`   ${latestCommitMessage}`);
console.log(`   Full hash: ${latestCommit}`);
console.log('═'.repeat(60));
console.log('');

// Check Vercel deployment
console.log('🔍 Checking Vercel deployment...');
console.log('   URL: https://glsl-discord-bot.vercel.app');
console.log('   Note: Vercel auto-deploys on push to master branch');
console.log('   To check deployment status:');
console.log('   1. Go to https://vercel.com/dashboard');
console.log('   2. Select your project: glsl-discord-bot');
console.log('   3. Check the latest deployment commit hash');
console.log('   4. Compare with:', latestCommitShort);
console.log('');

// Check Render.com deployment
console.log('🔍 Checking Render.com deployment...');
console.log('   URL: https://glsl-discord-bot.onrender.com');
console.log('   Note: Render.com auto-deploys on push to master branch');
console.log('   To check deployment status:');
console.log('   1. Go to https://dashboard.render.com');
console.log('   2. Select your service: glsl-discord-bot');
console.log('   3. Check the latest deployment commit hash');
console.log('   4. Compare with:', latestCommitShort);
console.log('');

// Instructions for manual deployment
console.log('🔄 Manual Deployment Instructions:');
console.log('═'.repeat(60));
console.log('');
console.log('Vercel:');
console.log('  1. Go to https://vercel.com/dashboard');
console.log('  2. Select your project');
console.log('  3. Click "Redeploy" on the latest deployment');
console.log('  4. Or use CLI: vercel --prod');
console.log('');
console.log('Render.com:');
console.log('  1. Go to https://dashboard.render.com');
console.log('  2. Select your service');
console.log('  3. Click "Manual Deploy" → "Deploy latest commit"');
console.log('  4. Or use CLI: render deploy');
console.log('');
console.log('✅ Verification:');
console.log('  - Check deployment logs for commit hash:', latestCommitShort);
console.log('  - Verify the deployment includes your latest changes');
console.log('  - Test the deployed application');
console.log('');

// Check if there are uncommitted changes
try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (status.trim()) {
        console.log('⚠️  WARNING: You have uncommitted changes!');
        console.log('   Commit and push your changes first.');
        console.log('');
    }
} catch (e) {
    // Ignore
}

// Check if local is ahead of remote
try {
    const ahead = execSync('git rev-list --count origin/master..HEAD', { encoding: 'utf-8' }).trim();
    if (ahead !== '0') {
        console.log('⚠️  WARNING: Local branch is ahead of remote!');
        console.log(`   You have ${ahead} unpushed commit(s).`);
        console.log('   Run: git push origin master');
        console.log('');
    }
} catch (e) {
    // Ignore
}

console.log('💡 Tip: Both Vercel and Render.com should auto-deploy on push to master.');
console.log('   If deployments are not updating, check:');
console.log('   1. Build logs for errors');
console.log('   2. Environment variables are set correctly');
console.log('   3. Deployment webhooks are configured');
console.log('');

