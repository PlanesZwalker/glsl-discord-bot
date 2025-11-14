import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // If user is not authenticated and trying to access dashboard,
    // redirect to home with callbackUrl parameter
    if (!req.nextauth.token && req.nextUrl.pathname.startsWith('/dashboard')) {
      const callbackUrl = req.nextUrl.pathname + req.nextUrl.search
      const url = req.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('callbackUrl', callbackUrl)
      return NextResponse.redirect(url)
    }
    
    // If user is authenticated and on dashboard, allow access
    if (req.nextauth.token && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.next()
    }
    
    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to dashboard only if authenticated
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*'],
}

