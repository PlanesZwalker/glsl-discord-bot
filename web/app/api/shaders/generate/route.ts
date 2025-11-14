import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = request.nextUrl.searchParams.get('userId') || session?.user?.id
    
    // En mode développement local, permettre l'accès sans authentification
    const isLocalDev = process.env.NODE_ENV === 'development'
    const isLocalhost = request.headers.get('host')?.includes('localhost')
    
    if (!isLocalDev || !isLocalhost) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { shape, color, animation, speed, size } = body

    if (!shape || !color || !animation) {
      return NextResponse.json(
        { error: 'Shape, color, and animation are required' },
        { status: 400 }
      )
    }

    // Try bot API first
    // In local development, try 127.0.0.1:8080 if BOT_API_URL is not set
    // Using 127.0.0.1 instead of localhost for better server-side compatibility
    let botApiUrl = process.env.BOT_API_URL
    const localBotUrls = ['http://127.0.0.1:8080', 'http://localhost:8080']
    
    if (!botApiUrl && isLocalDev && isLocalhost) {
      botApiUrl = localBotUrls[0]
    }

    if (botApiUrl) {
      let lastError: any = null
      const urlsToTry = isLocalDev && isLocalhost && !process.env.BOT_API_URL
        ? localBotUrls
        : [botApiUrl]
      
      for (const url of urlsToTry) {
        try {
          const response = await fetch(`${url}/api/shaders/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            body: JSON.stringify({
              shape,
              color,
              animation,
              speed: speed || 'normal',
              size: size || 5,
              userId,
            }),
            signal: AbortSignal.timeout(120000), // 2 minutes timeout
          })

          if (response.ok) {
            const data = await response.json()
            return NextResponse.json(data)
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Generation failed' }))
            return NextResponse.json(errorData, { status: response.status })
          }
        } catch (error: any) {
          lastError = error
          console.error(`Error calling bot API at ${url}:`, error)
          if (urlsToTry.indexOf(url) < urlsToTry.length - 1) {
            continue
          }
        }
      }
      
      const isConnectionError = lastError?.message?.includes('fetch failed') || 
                                lastError?.message?.includes('ECONNREFUSED') ||
                                lastError?.message?.includes('network') ||
                                lastError?.code === 'ECONNREFUSED'
      
      const errorMessage = isLocalDev && isLocalhost
        ? isConnectionError
          ? `Failed to connect to bot API. Tried: ${urlsToTry.join(', ')}. Make sure the bot is running (npm run bot in the root directory). Error: ${lastError?.message || 'Unknown error'}`
          : `Error calling bot API: ${lastError?.message || 'Unknown error'}`
        : lastError?.message || 'Failed to connect to bot API'
      return NextResponse.json(
        { error: errorMessage },
        { status: 503 }
      )
    }

    // Fallback: Return error if bot API is not configured
    const errorMessage = isLocalDev && isLocalhost
      ? 'Bot API not configured. Please set BOT_API_URL in web/.env.local (or start the bot with "npm run bot" and it will use http://localhost:8080 automatically).'
      : 'Bot API not configured. Please set BOT_API_URL environment variable.'
    return NextResponse.json(
      { error: errorMessage },
      { status: 503 }
    )
  } catch (error: any) {
    console.error('Error generating shader:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

