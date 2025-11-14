import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    console.log('Middleware - Path:', req.nextUrl.pathname)
    console.log('Middleware - Token:', !!req.nextauth.token)
    
    // Si pas de token, la redirection est gérée par withAuth
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const isAuthenticated = !!token
        const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard')
        
        console.log('Middleware Auth - Dashboard:', isOnDashboard, 'Auth:', isAuthenticated)
        
        if (isOnDashboard) {
          // Dashboard nécessite authentification
          return isAuthenticated
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

