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
    const userId = request.nextUrl.searchParams.get('userId') || session?.user?.id
    
    // En mode développement local, permettre l'accès sans authentification
    const isLocalDev = process.env.NODE_ENV === 'development'
    const isLocalhost = request.headers.get('host')?.includes('localhost')
    
    if (!isLocalDev || !isLocalhost) {
      // En production, nécessiter une session
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Try bot API first if available (recommended for production)
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl && userId) {
      try {
        const response = await fetch(`${botApiUrl}/api/shaders/${params.id}/gif?userId=${userId}`, {
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
    
    // En local, ne pas vérifier user_id si pas de session
    const shader = userId
      ? db.prepare('SELECT * FROM shaders WHERE id = ? AND user_id = ?').get(params.id, userId) as any
      : db.prepare('SELECT * FROM shaders WHERE id = ?').get(params.id) as any

    db.close()

    if (!shader || !shader.gif_path) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // IMPORTANT: Ne jamais lire depuis docs/gifs/ en production (Vercel)
    // Ces fichiers sont servis depuis GitHub raw et ne doivent pas être dans le bundle
    // Vérifier AVANT toute opération fs pour éviter que Vercel les inclue
    if (shader.gif_path && (shader.gif_path.includes('docs/gifs/') || shader.gif_path.includes('docs\\gifs\\'))) {
      console.warn(`[GIF API] Attempted to read from docs/gifs/ - redirecting to GitHub raw`)
      const shaderName = path.basename(shader.gif_path, path.extname(shader.gif_path))
      return NextResponse.redirect(
        `https://raw.githubusercontent.com/PlanesZwalker/glsl-discord-bot/master/docs/gifs/${shaderName}.gif`,
        302
      )
    }

    // En production Vercel, ne jamais accéder au système de fichiers pour les GIFs
    // Utiliser uniquement le bot API ou retourner une erreur
    const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL === '1'
    if (isVercel) {
      // En production Vercel, on ne peut pas lire depuis le système de fichiers
      // Retourner une erreur ou rediriger vers le bot API
      console.warn(`[GIF API] Vercel production - cannot read from filesystem, returning 404`)
      return NextResponse.json({ 
        error: 'File not available',
        message: 'In production, GIFs are served from the bot API. Please use the bot API endpoint.',
        shaderId: params.id
      }, { status: 404 })
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
