/**
 * Subscription Manager - Gestion des abonnements et intégration Stripe
 */

// Stripe - seulement si la clé est définie
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

// Plans disponibles
const PLANS = {
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
        priceId: process.env.STRIPE_PRICE_ID_PRO, // À configurer dans Stripe
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
        priceId: process.env.STRIPE_PRICE_ID_STUDIO, // À configurer dans Stripe
        features: [
            'Tout du niveau Pro',
            'Résolution 4K (3840x2160)',
            'Export multi-format',
            'API access (100 requêtes/jour)',
            'Collaboration en temps réel',
            'Support prioritaire'
        ]
    }
};

class SubscriptionManager {
    constructor(database) {
        this.database = database;
    }

    /**
     * Crée une session de checkout Stripe
     */
    async createCheckoutSession(userId, userEmail, planId) {
        try {
            const plan = PLANS[planId];
            if (!plan || !plan.priceId) {
                throw new Error(`Plan ${planId} non configuré ou invalide`);
            }

            // Créer ou récupérer le customer Stripe
            let customerId = await this.getOrCreateStripeCustomer(userId, userEmail);

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: plan.priceId,
                    quantity: 1
                }],
                mode: 'subscription',
                success_url: `${process.env.WEB_URL || 'https://glsl-discord-bot.onrender.com'}/dashboard?success=true&plan=${planId}`,
                cancel_url: `${process.env.WEB_URL || 'https://glsl-discord-bot.onrender.com'}/pricing?canceled=true`,
                metadata: {
                    userId,
                    plan: planId
                }
            });

            return { url: session.url, sessionId: session.id };
        } catch (error) {
            console.error('❌ Erreur création session Stripe:', error);
            throw error;
        }
    }

    /**
     * Récupère ou crée un customer Stripe
     */
    async getOrCreateStripeCustomer(userId, email) {
        try {
            if (!stripe) {
                throw new Error('Stripe non configuré');
            }
            
            // Vérifier si l'utilisateur a déjà un customer_id
            const user = await this.database.getUserById(userId);
            if (user && user.stripe_customer_id) {
                return user.stripe_customer_id;
            }

            // Créer un nouveau customer Stripe
            const customer = await stripe.customers.create({
                email: email,
                metadata: {
                    userId: userId
                }
            });

            // Sauvegarder le customer_id dans la base de données
            await this.database.updateUserPlan(userId, 'free', customer.id, email);

            return customer.id;
        } catch (error) {
            console.error('❌ Erreur création customer Stripe:', error);
            throw error;
        }
    }

    /**
     * Gère les webhooks Stripe
     */
    async handleWebhook(event) {
        try {
            if (!stripe) {
                console.error('❌ Stripe non configuré, impossible de traiter le webhook');
                return { received: false, error: 'Stripe not configured' };
            }
            
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log(`⚠️ Événement Stripe non géré: ${event.type}`);
            }

            return { received: true };
        } catch (error) {
            console.error('❌ Erreur traitement webhook Stripe:', error);
            throw error;
        }
    }

    /**
     * Gère la complétion d'un checkout
     */
    async handleCheckoutCompleted(session) {
        if (!stripe) {
            console.error('❌ Stripe non configuré');
            return;
        }
        
        const userId = session.metadata.userId;
        const planId = session.metadata.plan;

        if (!userId || !planId) {
            console.error('❌ Metadata manquante dans la session:', session);
            return;
        }

        // Récupérer l'abonnement depuis Stripe
        const subscriptionId = session.subscription;
        if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await this.syncSubscriptionToDatabase(userId, subscription, planId);
        }
    }

    /**
     * Gère la mise à jour d'un abonnement
     */
    async handleSubscriptionUpdated(subscription) {
        if (!stripe) {
            console.error('❌ Stripe non configuré');
            return;
        }
        
        const customerId = subscription.customer;
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata.userId;

        if (!userId) {
            console.error('❌ UserId non trouvé dans les métadonnées du customer');
            return;
        }

        // Déterminer le plan depuis le price_id
        const priceId = subscription.items.data[0].price.id;
        let planId = 'free';
        if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
            planId = 'pro';
        } else if (priceId === process.env.STRIPE_PRICE_ID_STUDIO) {
            planId = 'studio';
        }

        await this.syncSubscriptionToDatabase(userId, subscription, planId);
    }

    /**
     * Gère la suppression d'un abonnement
     */
    async handleSubscriptionDeleted(subscription) {
        if (!stripe) {
            console.error('❌ Stripe non configuré');
            return;
        }
        
        const customerId = subscription.customer;
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata.userId;

        if (!userId) {
            console.error('❌ UserId non trouvé dans les métadonnées du customer');
            return;
        }

        // Mettre à jour l'abonnement dans la base de données
        await this.database.upsertSubscription({
            user_id: userId,
            plan: 'free',
            status: 'canceled',
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: 1
        });

        // Mettre à jour le plan de l'utilisateur
        await this.database.updateUserPlan(userId, 'free');
    }

    /**
     * Gère un paiement réussi
     */
    async handlePaymentSucceeded(invoice) {
        // L'abonnement est déjà géré par handleSubscriptionUpdated
        console.log(`✅ Paiement réussi pour l'invoice ${invoice.id}`);
    }

    /**
     * Gère un paiement échoué
     */
    async handlePaymentFailed(invoice) {
        const customerId = invoice.customer;
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata.userId;

        if (userId) {
            console.log(`⚠️ Paiement échoué pour l'utilisateur ${userId}`);
            // Optionnel: envoyer une notification à l'utilisateur
        }
    }

    /**
     * Synchronise un abonnement Stripe avec la base de données
     */
    async syncSubscriptionToDatabase(userId, subscription, planId) {
        const status = subscription.status === 'active' || subscription.status === 'trialing' 
            ? 'active' 
            : subscription.status;

        await this.database.upsertSubscription({
            user_id: userId,
            plan: planId,
            status: status,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end ? 1 : 0
        });

        // Mettre à jour le plan de l'utilisateur
        await this.database.updateUserPlan(userId, planId);
    }

    /**
     * Récupère les plans disponibles
     */
    getPlans() {
        return PLANS;
    }

    /**
     * Annule un abonnement
     */
    async cancelSubscription(userId) {
        try {
            if (!stripe) {
                throw new Error('Stripe non configuré');
            }
            
            const subscription = await this.database.getActiveSubscription(userId);
            if (!subscription || !subscription.stripe_subscription_id) {
                throw new Error('Aucun abonnement actif trouvé');
            }

            // Annuler l'abonnement dans Stripe (à la fin de la période)
            await stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: true
            });

            // Mettre à jour dans la base de données
            await this.database.upsertSubscription({
                user_id: userId,
                plan: subscription.plan,
                status: 'active',
                stripe_subscription_id: subscription.stripe_subscription_id,
                stripe_price_id: subscription.stripe_price_id,
                current_period_start: subscription.current_period_start,
                current_period_end: subscription.current_period_end,
                cancel_at_period_end: 1
            });

            return { success: true, message: 'Abonnement annulé à la fin de la période' };
        } catch (error) {
            console.error('❌ Erreur annulation abonnement:', error);
            throw error;
        }
    }
}

module.exports = { SubscriptionManager, PLANS };

