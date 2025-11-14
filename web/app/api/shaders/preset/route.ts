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
    const { preset } = body

    if (!preset || typeof preset !== 'string') {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 })
    }

    // Try bot API first
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl) {
      try {
        const response = await fetch(`${botApiUrl}/api/shaders/preset`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
          body: JSON.stringify({
            preset: preset.toLowerCase(),
            userId,
          }),
          signal: AbortSignal.timeout(120000), // 2 minutes timeout
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json(data)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Compilation failed' }))
          return NextResponse.json(errorData, { status: response.status })
        }
      } catch (error: any) {
        console.error('Error calling bot API:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to connect to bot API' },
          { status: 503 }
        )
      }
    }

    // Fallback: Return error if bot API is not configured
    return NextResponse.json(
      { error: 'Bot API not configured. Please set BOT_API_URL environment variable.' },
      { status: 503 }
    )
  } catch (error: any) {
    console.error('Error compiling preset shader:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

