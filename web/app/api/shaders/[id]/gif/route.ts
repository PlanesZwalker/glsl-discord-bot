import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Force dynamic rendering since we use headers() via getServerSession
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try bot API first if available (recommended for production)
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl) {
      try {
        const response = await fetch(`${botApiUrl}/api/shaders/${params.id}/gif?userId=${session.user.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        })
        if (response.ok) {
          const blob = await response.blob()
          return new NextResponse(blob, {
            headers: {
              'Content-Type': 'image/gif',
              'Cache-Control': 'public, max-age=31536000',
            },
          })
        }
      } catch (error) {
        console.error('Error fetching from bot API:', error)
      }
    }

    // Fallback: Try direct database access (for local development)
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '..', 'data', 'shaders.db')
    const db = new Database(dbPath, { readonly: true })
    
    const shader = db
      .prepare('SELECT * FROM shaders WHERE id = ? AND user_id = ?')
      .get(params.id, session.user.id) as any

    db.close()

    if (!shader || !shader.gif_path) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const gifPath = path.isAbsolute(shader.gif_path) 
      ? shader.gif_path 
      : path.join(process.cwd(), '..', shader.gif_path)
    
    if (!fs.existsSync(gifPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(gifPath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving GIF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
