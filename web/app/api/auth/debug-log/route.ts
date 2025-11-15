import { NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Endpoint pour logger les erreurs d'authentification côté client
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('🔍 [Client Auth Debug]', {
      error: body.error,
      url: body.url,
      timestamp: body.timestamp,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in debug-log:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

