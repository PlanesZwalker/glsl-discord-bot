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

export async function GET(request: NextRequest) {
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

    // Try bot API first if available
    const botApiUrl = process.env.BOT_API_URL
    if (botApiUrl) {
      try {
        const response = await fetch(`${botApiUrl}/api/stats${userId ? `?userId=${userId}` : ''}`, {
          headers: {
            'Authorization': `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        })
        if (response.ok) {
          return NextResponse.json(await response.json())
        }
      } catch (error) {
        console.error('Error fetching stats from bot API:', error)
      }
    }

    // Fallback: Direct database access
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '..', 'data', 'shaders.db')
    
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ 
        totalShaders: 0,
        userShaders: 0,
        totalLikes: 0,
        totalViews: 0,
        shadersByDate: [],
        topShaders: []
      })
    }

    const db = new Database(dbPath, { readonly: true })
    
    // Statistiques globales
    const totalShaders = db.prepare('SELECT COUNT(*) as count FROM shaders').get() as any
    const totalLikes = db.prepare('SELECT SUM(likes) as total FROM shaders').get() as any
    const totalViews = db.prepare('SELECT SUM(views) as total FROM shaders').get() as any
    
    // Statistiques utilisateur
    let userShaders = 0
    let userLikes = 0
    let userViews = 0
    if (userId) {
      const userStats = db.prepare('SELECT COUNT(*) as count, SUM(likes) as likes, SUM(views) as views FROM shaders WHERE user_id = ?').get(userId) as any
      userShaders = userStats?.count || 0
      userLikes = userStats?.likes || 0
      userViews = userStats?.views || 0
    }
    
    // Shaders par date (30 derniers jours)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const shadersByDate = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM shaders
      WHERE created_at >= ?
      ${userId ? 'AND user_id = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(userId ? [thirtyDaysAgo.toISOString(), userId] : [thirtyDaysAgo.toISOString()]) as any[]
    
    // Top shaders (par likes)
    const topShaders = db.prepare(`
      SELECT id, name, likes, views, created_at
      FROM shaders
      ${userId ? 'WHERE user_id = ?' : ''}
      ORDER BY likes DESC, views DESC
      LIMIT 10
    `).all(userId ? [userId] : []) as any[]
    
    db.close()

    return NextResponse.json({
      totalShaders: totalShaders?.count || 0,
      userShaders: userShaders,
      totalLikes: totalLikes?.total || 0,
      userLikes: userLikes,
      totalViews: totalViews?.total || 0,
      userViews: userViews,
      shadersByDate: shadersByDate.map(row => ({
        date: row.date,
        count: row.count
      })),
      topShaders: topShaders.map(shader => ({
        id: shader.id,
        name: shader.name || `Shader #${shader.id}`,
        likes: shader.likes || 0,
        views: shader.views || 0,
        created_at: shader.created_at
      }))
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

