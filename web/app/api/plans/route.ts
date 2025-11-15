import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const apiUrl = process.env.API_URL || 'https://glsl-discord-bot.onrender.com'
        const response = await fetch(`${apiUrl}/api/plans`, {
            cache: 'no-store'
        })

        if (!response.ok) {
            throw new Error('Failed to fetch plans')
        }

        const plans = await response.json()
        return NextResponse.json(plans)
    } catch (error) {
        console.error('Error fetching plans:', error)
        // Retourner des plans par défaut en cas d'erreur
        return NextResponse.json({
            free: {
                name: 'Free',
                price: 0,
                features: [
                    '5 compilations/jour',
                    '10 presets/jour',
                    'Résolution 800x600',
                    'GIF 3 secondes, 30 FPS',
                    'Watermark',
                    'Stockage 7 jours'
                ]
            },
            pro: {
                name: 'Pro',
                price: 4.99,
                features: [
                    'Compilations illimitées',
                    'Résolution HD (1920x1080)',
                    'GIF jusqu\'à 10 secondes',
                    'Pas de watermark',
                    'Stockage cloud illimité',
                    'Export MP4',
                    'Priorité de compilation'
                ]
            },
            studio: {
                name: 'Studio',
                price: 14.99,
                features: [
                    'Tout du niveau Pro',
                    'Résolution 4K (3840x2160)',
                    'Export multi-format',
                    'API access (100 requêtes/jour)',
                    'Collaboration en temps réel',
                    'Support prioritaire'
                ]
            }
        })
    }
}

