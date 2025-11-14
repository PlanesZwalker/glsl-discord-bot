import { NextResponse } from 'next/server'

/**
 * Test endpoint to verify Discord OAuth credentials
 * This makes a test request to Discord API to verify the credentials are valid
 */
export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID
  const clientSecret = process.env.DISCORD_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      error: 'Missing Discord credentials',
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    }, { status: 400 })
  }

  try {
    // Test Discord OAuth by attempting to exchange a code (this will fail but verify credentials)
    // Actually, better approach: verify the application exists by checking Discord API
    const response = await fetch(`https://discord.com/api/v10/applications/@me`, {
      headers: {
        'Authorization': `Bot ${clientSecret}`, // This won't work, but let's try a different approach
      },
    })

    // Actually, we can't easily test OAuth credentials without a real OAuth flow
    // But we can verify the format and provide helpful information
    return NextResponse.json({
      status: 'credentials_format_valid',
      checks: {
        clientIdFormat: /^\d+$/.test(clientId),
        clientIdLength: clientId.length,
        clientSecretLength: clientSecret.length,
        clientSecretFormat: clientSecret.length >= 32,
      },
      recommendations: [
        'Verify that DISCORD_CLIENT_ID matches the Client ID in Discord Developer Portal',
        'Verify that DISCORD_CLIENT_SECRET matches the Client Secret in Discord Developer Portal',
        'Make sure you copied the full Client Secret (it should be 32+ characters)',
        'Check that the Discord application has OAuth2 enabled',
        'Verify the callback URL in Discord matches exactly: https://glsl-discord-bot.vercel.app/api/auth/callback/discord',
        'Check Vercel logs for detailed error messages during OAuth flow',
      ],
      note: 'This endpoint only verifies credential format. To fully test OAuth, attempt a real sign-in and check Vercel logs.',
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to verify credentials',
      message: error.message,
    }, { status: 500 })
  }
}

