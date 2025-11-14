import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

// DELETE shader
export async function DELETE(
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

    // Try bot API first if available
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl && userId) {
      try {
        const response = await fetch(`${botApiUrl}/api/shaders/${params.id}?userId=${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        })
        if (response.ok) {
          return NextResponse.json({ success: true })
        }
      } catch (error) {
        console.error('Error deleting from bot API:', error)
      }
    }

    // Fallback: Direct database access
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '..', 'data', 'shaders.db')
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 500 })
    }

    const db = new Database(dbPath)
    
    // Vérifier que le shader appartient à l'utilisateur
    const shader = userId
      ? db.prepare('SELECT * FROM shaders WHERE id = ? AND user_id = ?').get(params.id, userId) as any
      : db.prepare('SELECT * FROM shaders WHERE id = ?').get(params.id) as any

    if (!shader) {
      db.close()
      return NextResponse.json({ error: 'Shader not found or unauthorized' }, { status: 404 })
    }

    // Supprimer les fichiers associés si possible
    try {
      if (shader.image_path) {
        const imagePath = path.isAbsolute(shader.image_path)
          ? shader.image_path
          : path.join(process.cwd(), '..', shader.image_path)
        
        if (fs.existsSync(imagePath)) {
          if (fs.statSync(imagePath).isFile()) {
            fs.unlinkSync(imagePath)
          } else if (fs.statSync(imagePath).isDirectory()) {
            // Supprimer le répertoire et son contenu
            fs.rmSync(imagePath, { recursive: true, force: true })
          }
        }
      }
    } catch (fileError) {
      console.error('Error deleting shader files:', fileError)
      // Continue même si la suppression des fichiers échoue
    }

    // Supprimer de la base de données
    db.prepare('DELETE FROM shaders WHERE id = ?').run(params.id)
    db.close()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shader:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

