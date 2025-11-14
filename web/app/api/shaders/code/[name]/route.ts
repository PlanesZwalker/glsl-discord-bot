import { NextRequest, NextResponse } from 'next/server'
import { shaderCodes } from '@/lib/shaderCodes'

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const shaderName = params.name.toLowerCase()

    // Try fetching from bot API first
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl) {
      try {
        const apiKey = process.env.BOT_API_KEY || ''
        const response = await fetch(`${botApiUrl}/api/shaders/code/${shaderName}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(5000),
        })
        
        if (response.ok) {
          const data = await response.json()
          // Verify we got valid shader code
          if (data.code && typeof data.code === 'string' && !data.code.includes('not available')) {
            return NextResponse.json(data)
          }
        } else if (response.status === 404) {
          // Shader not found in bot API, try fallback
          if (shaderCodes[shaderName]) {
            return NextResponse.json({
              name: shaderName,
              code: shaderCodes[shaderName]
            })
          }
          // Shader not found in bot API or fallback
          return NextResponse.json({
            name: shaderName,
            code: `// Shader "${shaderName}" not found.\n// Use /shader-code in Discord to see available presets.\n// Or visit: https://github.com/PlanesZwalker/glsl-discord-bot`
          })
        }
      } catch (error: any) {
        // Log error but continue to fallback
        console.error('Error fetching from bot API:', error.message || error)
        // If it's a timeout or network error, we'll use fallback
      }
    }

    // Fallback: Try local shader codes
    if (shaderCodes[shaderName]) {
      return NextResponse.json({
        name: shaderName,
        code: shaderCodes[shaderName]
      })
    }

    // Final fallback: Return helpful message
    // This happens when BOT_API_URL is not configured and shader is not in fallback list
    return NextResponse.json({
      name: shaderName,
      code: `// Shader code not available via web API.\n// To view the code for "${shaderName}":\n// 1. Use /shader-code ${shaderName} in Discord\n// 2. Or configure BOT_API_URL in Vercel environment variables\n// 3. Or visit: https://github.com/PlanesZwalker/glsl-discord-bot`
    })
  } catch (error) {
    console.error('Error fetching shader code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

