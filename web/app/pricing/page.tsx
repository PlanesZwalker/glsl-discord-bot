'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Check, X, Zap, Crown, Building2 } from 'lucide-react'

interface Plan {
    id: string
    name: string
    price: number
    priceId?: string
    features: string[]
    icon: React.ReactNode
    popular?: boolean
    buttonText: string
    buttonColor: string
}

export default function PricingPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const response = await fetch('/api/plans')
            if (!response.ok) {
                throw new Error('Failed to fetch plans')
            }
            const data = await response.json()
            
            const plansData: Plan[] = [
                {
                    id: 'free',
                    name: data.free?.name || 'Free',
                    price: data.free?.price || 0,
                    features: data.free?.features || [],
                    icon: <Zap className="w-6 h-6" />,
                    buttonText: 'Commencer gratuitement',
                    buttonColor: 'bg-gray-600 hover:bg-gray-700'
                },
                {
                    id: 'pro',
                    name: data.pro?.name || 'Pro',
                    price: data.pro?.price || 4.99,
                    priceId: data.pro?.priceId,
                    features: data.pro?.features || [],
                    icon: <Crown className="w-6 h-6" />,
                    popular: true,
                    buttonText: 'Passer à Pro',
                    buttonColor: 'bg-purple-600 hover:bg-purple-700'
                },
                {
                    id: 'studio',
                    name: data.studio?.name || 'Studio',
                    price: data.studio?.price || 14.99,
                    priceId: data.studio?.priceId,
                    features: data.studio?.features || [],
                    icon: <Building2 className="w-6 h-6" />,
                    buttonText: 'Passer à Studio',
                    buttonColor: 'bg-indigo-600 hover:bg-indigo-700'
                }
            ]
            
            setPlans(plansData)
        } catch (err) {
            console.error('Error fetching plans:', err)
            setError('Impossible de charger les plans. Veuillez réessayer plus tard.')
            // Plans par défaut en cas d'erreur
            setPlans([
                {
                    id: 'free',
                    name: 'Free',
                    price: 0,
                    features: [
                        '5 compilations/jour',
                        '10 presets/jour',
                        'Résolution 800x600',
                        'GIF 3 secondes, 30 FPS',
                        'Watermark',
                        'Stockage 7 jours'
                    ],
                    icon: <Zap className="w-6 h-6" />,
                    buttonText: 'Commencer gratuitement',
                    buttonColor: 'bg-gray-600 hover:bg-gray-700'
                },
                {
                    id: 'pro',
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
                    ],
                    icon: <Crown className="w-6 h-6" />,
                    popular: true,
                    buttonText: 'Passer à Pro',
                    buttonColor: 'bg-purple-600 hover:bg-purple-700'
                },
                {
                    id: 'studio',
                    name: 'Studio',
                    price: 14.99,
                    features: [
                        'Tout du niveau Pro',
                        'Résolution 4K (3840x2160)',
                        'Export multi-format',
                        'API access (100 requêtes/jour)',
                        'Collaboration en temps réel',
                        'Support prioritaire'
                    ],
                    icon: <Building2 className="w-6 h-6" />,
                    buttonText: 'Passer à Studio',
                    buttonColor: 'bg-indigo-600 hover:bg-indigo-700'
                }
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleSubscribe = async (planId: string, priceId?: string) => {
        if (planId === 'free') {
            // Rediriger vers le dashboard
            window.location.href = '/dashboard'
            return
        }

        if (!priceId) {
            alert('Ce plan n\'est pas encore disponible. Veuillez réessayer plus tard.')
            return
        }

        try {
            // Récupérer l'utilisateur depuis la session
            const response = await fetch('/api/auth/session')
            const session = await response.json()
            
            if (!session?.user?.id) {
                // Rediriger vers la connexion
                window.location.href = '/api/auth/signin?callbackUrl=/pricing'
                return
            }

            // Créer une session de checkout Stripe
            const subscribeResponse = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: session.user.id,
                    userEmail: session.user.email,
                    planId: planId
                })
            })

            if (!subscribeResponse.ok) {
                throw new Error('Failed to create checkout session')
            }

            const { url } = await subscribeResponse.json()
            
            if (url) {
                window.location.href = url
            } else {
                throw new Error('No checkout URL returned')
            }
        } catch (err) {
            console.error('Error subscribing:', err)
            alert('Erreur lors de la création de la session de paiement. Veuillez réessayer.')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
                <Navbar />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
            <Navbar />
            <main className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Choisissez votre plan
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Commencez gratuitement ou passez à un plan premium pour débloquer toutes les fonctionnalités
                    </p>
                </div>

                {error && (
                    <div className="max-w-4xl mx-auto mb-8 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-200">{error}</p>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-transform hover:scale-105 ${
                                plan.popular ? 'ring-4 ring-purple-500 dark:ring-purple-400' : ''
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                        Populaire
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white mb-4">
                                    {plan.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl font-bold">
                                        {plan.price === 0 ? 'Gratuit' : `€${plan.price.toFixed(2)}`}
                                    </span>
                                    {plan.price > 0 && (
                                        <span className="text-gray-600 dark:text-gray-400">/mois</span>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleSubscribe(plan.id, plan.priceId)}
                                className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${plan.buttonColor} ${
                                    plan.popular ? 'shadow-lg' : ''
                                }`}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <h2 className="text-3xl font-bold mb-8">Questions fréquentes</h2>
                    <div className="max-w-3xl mx-auto space-y-6 text-left">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                            <h3 className="font-semibold text-lg mb-2">Puis-je changer de plan à tout moment ?</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Oui, vous pouvez mettre à jour ou annuler votre abonnement à tout moment depuis votre dashboard.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                            <h3 className="font-semibold text-lg mb-2">Les paiements sont-ils sécurisés ?</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Oui, tous les paiements sont traités de manière sécurisée via Stripe, un leader mondial des paiements en ligne.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                            <h3 className="font-semibold text-lg mb-2">Y a-t-il un essai gratuit ?</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Le plan Free est toujours gratuit ! Vous pouvez commencer à l'utiliser immédiatement sans carte bancaire.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}

