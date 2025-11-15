import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering - cette route nécessite une session utilisateur
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { planId } = body

        // Utiliser l'ID de la session, pas celui du body pour la sécurité
        const apiUrl = process.env.API_URL || 'https://glsl-discord-bot.onrender.com'
        const response = await fetch(`${apiUrl}/api/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: session.user.id,
                userEmail: session.user.email || null,
                planId
            })
        })

        if (!response.ok) {
            const error = await response.json()
            return NextResponse.json(
                { error: error.error || 'Failed to create checkout session' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

