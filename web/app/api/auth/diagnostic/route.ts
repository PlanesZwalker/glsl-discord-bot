import { NextResponse } from 'next/server'

export async function GET() {
  // Check environment variables (without exposing secrets)
  const checks = {
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
    hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
    discordClientIdLength: process.env.DISCORD_CLIENT_ID?.length || 0,
    hasDiscordClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
    discordClientSecretLength: process.env.DISCORD_CLIENT_SECRET?.length || 0,
    expectedCallbackUrl: process.env.NEXTAUTH_URL 
      ? `${process.env.NEXTAUTH_URL}/api/auth/callback/discord`
      : 'NOT SET (NEXTAUTH_URL missing)',
    nodeEnv: process.env.NODE_ENV,
  }

  const allConfigured = 
    checks.hasNextAuthUrl &&
    checks.hasNextAuthSecret &&
    checks.hasDiscordClientId &&
    checks.hasDiscordClientSecret

  // Validate NEXTAUTH_URL format
  let urlValidation = {
    isValid: false,
    hasHttps: false,
    hasTrailingSlash: false,
    matchesExpected: false,
    message: '',
    expectedUrl: 'https://glsl-discord-bot.vercel.app',
  }

  if (checks.hasNextAuthUrl && process.env.NEXTAUTH_URL) {
    const url = process.env.NEXTAUTH_URL.trim()
    urlValidation.hasHttps = url.startsWith('https://')
    urlValidation.hasTrailingSlash = url.endsWith('/')
    urlValidation.matchesExpected = url === urlValidation.expectedUrl
    
    if (!urlValidation.hasHttps) {
      urlValidation.message = 'NEXTAUTH_URL must start with https:// (not http://)'
    } else if (urlValidation.hasTrailingSlash) {
      urlValidation.message = 'NEXTAUTH_URL should not have a trailing slash'
    } else if (!urlValidation.matchesExpected) {
      urlValidation.message = `NEXTAUTH_URL should be exactly: ${urlValidation.expectedUrl}`
    } else {
      urlValidation.isValid = true
      urlValidation.message = 'NEXTAUTH_URL format is correct'
    }
  }

  // Additional checks
  const additionalChecks = {
    nextAuthSecretValid: checks.nextAuthSecretLength >= 32, // Should be at least 32 chars
    discordClientIdFormat: checks.hasDiscordClientId && /^\d+$/.test(process.env.DISCORD_CLIENT_ID || ''), // Discord IDs are numeric
    discordClientSecretFormat: checks.hasDiscordClientSecret && checks.discordClientSecretLength >= 32, // Should be at least 32 chars
  }

  const recommendations = [
    !checks.hasNextAuthUrl && 'Set NEXTAUTH_URL to https://glsl-discord-bot.vercel.app',
    !checks.hasNextAuthSecret && 'Generate and set NEXTAUTH_SECRET (use: openssl rand -base64 32)',
    !checks.hasDiscordClientId && 'Set DISCORD_CLIENT_ID from Discord Developer Portal',
    !checks.hasDiscordClientSecret && 'Set DISCORD_CLIENT_SECRET from Discord Developer Portal',
    !urlValidation.isValid && urlValidation.message,
    checks.hasNextAuthUrl && !urlValidation.matchesExpected && 
      `NEXTAUTH_URL should be exactly: ${urlValidation.expectedUrl} (current: "${checks.nextAuthUrl}")`,
    checks.hasNextAuthSecret && !additionalChecks.nextAuthSecretValid && 
      'NEXTAUTH_SECRET seems too short. Generate a new one with: openssl rand -base64 32',
    checks.hasDiscordClientId && !additionalChecks.discordClientIdFormat && 
      'DISCORD_CLIENT_ID format seems invalid. It should be a numeric string.',
    checks.hasDiscordClientSecret && !additionalChecks.discordClientSecretFormat && 
      'DISCORD_CLIENT_SECRET seems too short. Make sure you copied the full secret from Discord.',
    // Specific recommendation for "Application inconnue" error
    checks.hasDiscordClientId && checks.hasDiscordClientSecret && 
      'If you see "Application inconnue" error: 1) Verify DISCORD_CLIENT_ID matches the Client ID in Discord Developer Portal (OAuth2 section), 2) Verify DISCORD_CLIENT_SECRET matches the Client Secret (click "Reset Secret" if unsure and copy the new one), 3) Make sure OAuth2 is enabled in your Discord application, 4) Check that the callback URL in Discord matches exactly: https://glsl-discord-bot.vercel.app/api/auth/callback/discord',
    allConfigured && urlValidation.isValid && 
      'All variables are set correctly. If the error persists, try: 1) Verify your Discord application is verified (Discord Developer Portal → General → Verification Status - unverified apps may have OAuth restrictions), 2) Regenerating NEXTAUTH_SECRET, 3) Verifying Discord Client ID/Secret match your Discord app, 4) Checking Vercel logs for detailed error messages.',
    // Specific recommendation for unverified Discord apps
    allConfigured && urlValidation.isValid &&
      '⚠️ IMPORTANT: If you see "Unknown authentication error", your Discord application might not be verified. Unverified Discord applications have OAuth restrictions. To verify: 1) Go to Discord Developer Portal → Your App → General, 2) Check "Verification Status", 3) If unverified, Discord may limit OAuth to 25 users or require verification for full OAuth access. For testing, you can use OAuth with an unverified app, but you may need to verify it for production use.',
  ].filter(Boolean)

  return NextResponse.json({
    status: allConfigured && urlValidation.isValid ? 'configured' : 'configuration_issue',
    checks,
    urlValidation,
    additionalChecks,
    recommendations,
  })
}

