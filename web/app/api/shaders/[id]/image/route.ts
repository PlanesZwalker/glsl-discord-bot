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
        const response = await fetch(`${botApiUrl}/api/shaders/${params.id}/image?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        })
        if (response.ok) {
          const blob = await response.blob()
          return new NextResponse(blob, {
            headers: {
              'Content-Type': 'image/png',
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

    if (!shader || !shader.image_path) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check if image_path is a file (GIF) or a directory (frames)
    const imagePath = shader.image_path
    // Handle both absolute and relative paths
    let fullPath: string
    if (path.isAbsolute(imagePath)) {
      fullPath = imagePath
    } else {
      // Try relative to project root first, then relative to web directory
      const projectRoot = path.join(process.cwd(), '..')
      const relativePath = path.join(projectRoot, imagePath)
      if (fs.existsSync(relativePath)) {
        fullPath = relativePath
      } else {
        fullPath = path.join(process.cwd(), imagePath)
      }
    }
    
    console.log(`[Image API] Shader ID: ${params.id}, Image path: ${imagePath}, Full path: ${fullPath}, Exists: ${fs.existsSync(fullPath)}`)
    
    // If it's a file (GIF), serve it directly
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase()
      const contentType = ext === '.gif' ? 'image/gif' : 'image/png'
      const fileBuffer = fs.readFileSync(fullPath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    }
    
    // If it's a directory, try to get first frame
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      const files = fs.readdirSync(fullPath)
        .filter(f => f.endsWith('.png'))
        .sort()
      
      if (files.length > 0) {
        const firstFrame = path.join(fullPath, files[0])
        const fileBuffer = fs.readFileSync(firstFrame)
        
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000',
          },
        })
      }
    }

    // File not found - return a helpful error message
    console.error(`[Image API] File not found for shader ${params.id}: ${fullPath}`)
    return NextResponse.json({ 
      error: 'File not found',
      message: `The shader image file does not exist at: ${fullPath}. The shader may need to be recompiled.`,
      shaderId: params.id,
      imagePath: imagePath
    }, { status: 404 })
  } catch (error) {
    console.error('Error serving image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
