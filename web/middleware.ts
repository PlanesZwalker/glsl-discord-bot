import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { NextRequestWithAuth } from 'next-auth/middleware'

// Middleware personnalisé qui vérifie d'abord si on est en local
function customMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // En mode développement local, permettre l'accès au dashboard sans authentification
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     (req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1')
  
  if (isLocalDev && pathname.startsWith('/dashboard')) {
    console.log('✅ Middleware - Mode développement local, autorisation dashboard sans authentification')
    return NextResponse.next()
  }
  
  // En production ou si pas en local, utiliser withAuth
  return null // null signifie qu'on continue avec withAuth
}

// Créer le middleware withAuth pour la production
const authMiddleware = withAuth(
  function authMiddlewareHandler(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    
    console.log('🔍 Middleware - Path:', pathname)
    console.log('🔍 Middleware - Has Token:', !!token)
    
    // Si authentifié et accédant au dashboard, autoriser
    if (token && pathname.startsWith('/dashboard')) {
      console.log('✅ Middleware - Authentifié, autorisation dashboard')
      return NextResponse.next()
    }
    
    // Si non authentifié et accédant au dashboard, rediriger vers sign-in avec callbackUrl
    if (!token && pathname.startsWith('/dashboard')) {
      const callbackUrl = pathname + req.nextUrl.search
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('callbackUrl', callbackUrl)
      console.log('🔄 Middleware - Non authentifié, redirection vers / avec callbackUrl:', callbackUrl)
      return NextResponse.redirect(url)
    }
    
    // Autres routes
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const isAuthenticated = !!token
        const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
        
        console.log('🔍 Middleware Auth Check - Dashboard:', isOnDashboard, 'Authenticated:', isAuthenticated)
        
        if (isOnDashboard) {
          // Dashboard nécessite authentification en production
          // Retourner true pour laisser le middleware gérer la redirection avec callbackUrl
          return true
        }
        
        // Autres routes autorisées
        return true
      },
    },
    pages: {
      signIn: '/',
    },
  }
)

// Export du middleware conditionnel
export default function middleware(req: NextRequest) {
  // D'abord, vérifier si on est en local
  const localResult = customMiddleware(req)
  if (localResult) {
    return localResult
  }
  
  // Sinon, utiliser withAuth pour la production
  // withAuth retourne une fonction qui attend NextRequestWithAuth
  // En Next.js 13+, le middleware n'a qu'un seul argument, mais withAuth peut en attendre 2
  return (authMiddleware as any)(req as NextRequestWithAuth)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}

