import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
        const { userId, userEmail, planId } = body

        // Vérifier que l'userId correspond à la session
        if (userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            )
        }

        const apiUrl = process.env.API_URL || 'https://glsl-discord-bot.onrender.com'
        const response = await fetch(`${apiUrl}/api/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId || session.user.id,
                userEmail: userEmail || session.user.email,
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

