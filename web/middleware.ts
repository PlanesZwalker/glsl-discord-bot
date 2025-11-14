import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    
    // If user is authenticated and accessing dashboard, allow it
    if (token && pathname.startsWith('/dashboard')) {
      return NextResponse.next()
    }
    
    // If user is not authenticated and trying to access dashboard,
    // redirect to home with callbackUrl
    if (!token && pathname.startsWith('/dashboard')) {
      const callbackUrl = pathname + req.nextUrl.search
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('callbackUrl', callbackUrl)
      return NextResponse.redirect(url)
    }
    
    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // For dashboard routes, require authentication
        // Return true to allow the middleware function to handle the redirect
        // This way we can control the redirect URL with callbackUrl
        if (pathname.startsWith('/dashboard')) {
          // Always return true here, let the middleware function handle redirects
          // This allows us to customize the redirect URL
          return true
        }
        
        // For all other routes, allow access
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
  ],
}

