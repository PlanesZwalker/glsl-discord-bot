import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
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
          // Dashboard nécessite authentification
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

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}

