import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Force dynamic rendering - NextAuth nécessite des sessions dynamiques
export const dynamic = 'force-dynamic'

const handler = NextAuth(authOptions)

// Add error handling wrapper with better error capture
export async function GET(request: Request, context: any) {
  try {
    // Log request details for debugging
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    console.log('🔍 NextAuth GET request:', {
      pathname: url.pathname,
      searchParams,
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        'user-agent': request.headers.get('user-agent'),
        host: request.headers.get('host'),
      },
    })
    
    // Check for OAuth callback errors in URL parameters
    if (searchParams.error) {
      console.error('❌ OAuth error detected in URL:', {
        error: searchParams.error,
        errorDescription: searchParams.error_description,
        errorUri: searchParams.error_uri,
        state: searchParams.state,
        allParams: searchParams, // Log all params for debugging
      })
      
      // If there's an error, redirect to error page with details
      const errorUrl = new URL('/api/auth/error', request.url)
      errorUrl.searchParams.set('error', searchParams.error)
      if (searchParams.error_description) {
        errorUrl.searchParams.set('error_description', searchParams.error_description)
      }
      return NextResponse.redirect(errorUrl)
    }
    
    const response = await handler(request, context)
    
    // Log response details
    if (response) {
      const responseStatus = response.status
      console.log('✅ NextAuth GET response:', {
        status: responseStatus,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })
      
      // If response is a redirect to error page, log it
      if (responseStatus >= 300 && responseStatus < 400) {
        const location = response.headers.get('location')
        if (location?.includes('/api/auth/error')) {
          console.error('⚠️ NextAuth redirecting to error page:', location)
        }
      }
    }
    
    return response
  } catch (error: any) {
    console.error('❌ NextAuth GET error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      cause: error.cause,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
    
    // Try to extract error information for better debugging
    const errorMessage = error?.message || 'Unknown error'
    const errorCode = error?.code || error?.type || 'UNKNOWN'
    
    // If it's an authentication error, redirect to error page with details
    if (errorMessage.includes('auth') || errorMessage.includes('OAuth') || errorMessage.includes('Discord')) {
      const errorUrl = new URL('/api/auth/error', request.url)
      errorUrl.searchParams.set('error', errorCode.toLowerCase())
      errorUrl.searchParams.set('error_description', errorMessage)
      return NextResponse.redirect(errorUrl)
    }
    
    throw error
  }
}

export async function POST(request: Request, context: any) {
  try {
    // Log request details for debugging
    const url = new URL(request.url)
    const searchParams = Object.fromEntries(url.searchParams)
    
    console.log('🔍 NextAuth POST request:', {
      pathname: url.pathname,
      searchParams,
      headers: {
        cookie: request.headers.get('cookie') ? 'present' : 'missing',
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
        host: request.headers.get('host'),
      },
    })
    
    // Try to read body for debugging (but don't consume it)
    try {
      const clonedRequest = request.clone()
      const body = await clonedRequest.text()
      if (body) {
        console.log('🔍 NextAuth POST body:', body.substring(0, 500))
        
        // Try to parse body as form data to check for OAuth errors
        try {
          const formData = new URLSearchParams(body)
          const error = formData.get('error')
          const errorDescription = formData.get('error_description')
          if (error) {
            // Si error est '[object Object]', essayer de parser le body comme JSON
            let parsedError = error
            let parsedErrorDescription = errorDescription
            if (error === '[object Object]' || error.includes('object Object')) {
              try {
                const jsonBody = JSON.parse(body)
                parsedError = jsonBody.error || error
                parsedErrorDescription = jsonBody.error_description || jsonBody.errorDescription || errorDescription
              } catch (jsonError) {
                // Si ce n'est pas du JSON, garder l'erreur originale
              }
            }
            console.error('❌ OAuth error detected in POST body:', {
              error: parsedError,
              errorDescription: parsedErrorDescription,
              rawBody: body.substring(0, 200), // Log first 200 chars for debugging
            })
          }
        } catch (e) {
          // Ignore parsing errors, but log them for debugging
          console.warn('⚠️ Error parsing POST body for OAuth errors:', e)
        }
      }
    } catch (e) {
      // Ignore body read errors
    }
    
    const response = await handler(request, context)
    
    // Log response details
    if (response) {
      const responseStatus = response.status
      console.log('✅ NextAuth POST response:', {
        status: responseStatus,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })
      
      // If response is a redirect to error page, log it
      if (responseStatus >= 300 && responseStatus < 400) {
        const location = response.headers.get('location')
        if (location?.includes('/api/auth/error')) {
          console.error('⚠️ NextAuth redirecting to error page:', location)
        }
      }
    }
    
    return response
  } catch (error: any) {
    console.error('❌ NextAuth POST error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      cause: error.cause,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
    
    // Try to extract error information for better debugging
    const errorMessage = error?.message || 'Unknown error'
    const errorCode = error?.code || error?.type || 'UNKNOWN'
    
    // If it's an authentication error, redirect to error page with details
    if (errorMessage.includes('auth') || errorMessage.includes('OAuth') || errorMessage.includes('Discord')) {
      const errorUrl = new URL('/api/auth/error', request.url)
      errorUrl.searchParams.set('error', errorCode.toLowerCase())
      errorUrl.searchParams.set('error_description', errorMessage)
      return NextResponse.redirect(errorUrl)
    }
    
    throw error
  }
}
