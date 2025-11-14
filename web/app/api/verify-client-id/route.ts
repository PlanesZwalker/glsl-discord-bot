import { NextResponse } from 'next/server'

/**
 * Endpoint pour vérifier si le Client ID Discord est valide
 * Vérifie que l'application Discord existe et que le bot est configuré
 */
export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({
      error: 'Client ID manquant',
      hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
      hasNextPublicDiscordClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      recommendation: 'Configurez DISCORD_CLIENT_ID et NEXT_PUBLIC_DISCORD_CLIENT_ID dans Vercel',
    }, { status: 400 })
  }

  try {
    // Vérifier que l'application Discord existe en faisant une requête à l'API Discord
    // Note: Cette requête nécessite un token bot, mais on peut au moins vérifier le format
    const response = await fetch(`https://discord.com/api/v10/applications/${clientId}/rpc`, {
      method: 'GET',
      headers: {
        'User-Agent': 'GLSL-Discord-Bot/1.0',
      },
    })

    // Si on obtient 401/403, l'application existe mais on n'a pas les permissions
    // Si on obtient 404, l'application n'existe pas
    // Si on obtient 200, l'application existe

    const status = response.status
    const exists = status !== 404

    return NextResponse.json({
      clientId,
      status,
      applicationExists: exists,
      message: exists 
        ? 'L\'application Discord existe (ou nécessite une authentification pour vérifier)'
        : 'L\'application Discord n\'existe pas ou le Client ID est incorrect',
      checks: {
        clientIdFormat: /^\d+$/.test(clientId),
        clientIdLength: clientId.length,
        hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
        hasNextPublicDiscordClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
        bothMatch: process.env.DISCORD_CLIENT_ID === process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      },
      recommendations: [
        !exists && 'Le Client ID ne correspond à aucune application Discord. Vérifiez dans Discord Developer Portal que l\'Application ID est correct.',
        !exists && 'Assurez-vous que l\'application Discord existe dans https://discord.com/developers/applications',
        !exists && 'Vérifiez que le bot a été créé (Bot → Add Bot)',
        process.env.DISCORD_CLIENT_ID !== process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID && 'DISCORD_CLIENT_ID et NEXT_PUBLIC_DISCORD_CLIENT_ID doivent avoir la même valeur',
        'Générez l\'URL d\'invitation directement depuis Discord Developer Portal (OAuth2 → URL Generator) pour être sûr qu\'elle est correcte',
      ].filter(Boolean),
      inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8454144&scope=bot%20applications.commands`,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Erreur lors de la vérification',
      message: error.message,
      clientId,
      checks: {
        clientIdFormat: /^\d+$/.test(clientId),
        clientIdLength: clientId.length,
        hasDiscordClientId: !!process.env.DISCORD_CLIENT_ID,
        hasNextPublicDiscordClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      },
    }, { status: 500 })
  }
}

