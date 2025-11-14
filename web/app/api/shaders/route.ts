import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Note: In production, you might want to use a shared database connection
// or a database service like Supabase, PlanetScale, etc.

// Force dynamic rendering since we use headers() via getServerSession
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = request.nextUrl.searchParams.get('userId')
    
    // En mode développement local, permettre l'accès sans authentification
    const isLocalDev = process.env.NODE_ENV === 'development'
    const isLocalhost = request.headers.get('host')?.includes('localhost')
    
    // Si on n'est PAS en local, exiger l'authentification
    if (!(isLocalDev && isLocalhost)) {
      // En production, nécessiter une session
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (userId && userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Try fetching from bot API first (recommended for production)
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl) {
      try {
        const response = await fetch(`${botApiUrl}/api/shaders?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
        if (response.ok) {
          const data = await response.json()
          return NextResponse.json(data)
        } else {
          // Log the error but continue to fallback
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error(`Bot API error (${response.status}):`, errorText)
          // Continue to fallback instead of returning error immediately
        }
      } catch (error: any) {
        console.error('Error fetching from bot API:', error.message || error)
        // Continue to fallback instead of returning error immediately
      }
    }

    // Fallback: Try direct database access (for local development only)
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '..', 'data', 'shaders.db')
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ 
        error: 'Database not found. Please configure BOT_API_URL in Vercel environment variables to connect to the bot API.' 
      }, { status: 500 })
    }

    const db = new Database(dbPath, { readonly: true })
    
    const shaders = db
      .prepare('SELECT * FROM shaders WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId)

    db.close()

    return NextResponse.json(shaders)
  } catch (error) {
    console.error('Error fetching shaders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

