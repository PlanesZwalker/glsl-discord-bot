import { GET, POST } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'

// Mock NextAuth
jest.mock('next-auth', () => {
  const mockHandler = jest.fn()
  return jest.fn(() => mockHandler)
})

// Mock authOptions
jest.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
    callbacks: {},
  },
}))

describe('NextAuth API Routes', () => {
  const mockNextAuth = NextAuth as jest.MockedFunction<typeof NextAuth>
  let mockHandler: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockHandler = jest.fn()
    mockNextAuth.mockReturnValue(mockHandler as any)
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('GET /api/auth/[...nextauth]', () => {
    it('devrait logger les détails de la requête', async () => {
      const url = 'https://test.example.com/api/auth/signin?provider=discord'
      const request = new Request(url, {
        headers: {
          'user-agent': 'test-agent',
          'host': 'test.example.com',
        },
      })

      mockHandler.mockResolvedValue(new NextResponse(null, { status: 200 }))

      await GET(request, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 NextAuth GET request:'),
        expect.objectContaining({
          pathname: '/api/auth/signin',
        })
      )
    })

    it('devrait détecter les erreurs OAuth dans les paramètres URL', async () => {
      const url = 'https://test.example.com/api/auth/callback/discord?error=access_denied&error_description=User%20denied'
      const request = new Request(url)

      mockHandler.mockResolvedValue(new NextResponse(null, { status: 200 }))

      await GET(request, {})

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ OAuth error detected in URL:'),
        expect.objectContaining({
          error: 'access_denied',
        })
      )
    })

    it('devrait logger les détails de la réponse', async () => {
      const url = 'https://test.example.com/api/auth/signin'
      const request = new Request(url)

      const response = new NextResponse(null, { status: 302 })
      response.headers.set('location', '/dashboard')
      mockHandler.mockResolvedValue(response)

      await GET(request, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ NextAuth GET response:'),
        expect.objectContaining({
          status: 302,
        })
      )
    })

    it('devrait logger si la réponse redirige vers la page d\'erreur', async () => {
      const url = 'https://test.example.com/api/auth/signin'
      const request = new Request(url)

      const response = new NextResponse(null, { status: 302 })
      response.headers.set('location', '/api/auth/error?error=unknown')
      mockHandler.mockResolvedValue(response)

      await GET(request, {})

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ NextAuth redirecting to error page:'),
        '/api/auth/error?error=unknown'
      )
    })

    it('devrait gérer les erreurs et rediriger vers la page d\'erreur', async () => {
      const url = 'https://test.example.com/api/auth/signin'
      const request = new Request(url)

      const error = new Error('OAuth authentication failed')
      mockHandler.mockRejectedValue(error)

      const response = await GET(request, {})

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(307) // Redirect
      const location = response.headers.get('location')
      expect(location).toContain('/api/auth/error')
    })

    it('devrait propager les erreurs non liées à l\'authentification', async () => {
      const url = 'https://test.example.com/api/auth/signin'
      const request = new Request(url)

      const error = new Error('Network error')
      mockHandler.mockRejectedValue(error)

      await expect(GET(request, {})).rejects.toThrow('Network error')
    })
  })

  describe('POST /api/auth/[...nextauth]', () => {
    it('devrait logger les détails de la requête POST', async () => {
      const url = 'https://test.example.com/api/auth/callback/discord'
      const request = new Request(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'test-agent',
        },
        body: 'code=test-code&state=test-state',
      })

      mockHandler.mockResolvedValue(new NextResponse(null, { status: 200 }))

      await POST(request, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 NextAuth POST request:'),
        expect.objectContaining({
          pathname: '/api/auth/callback/discord',
        })
      )
    })

    it('devrait logger le body de la requête POST', async () => {
      const url = 'https://test.example.com/api/auth/callback/discord'
      const request = new Request(url, {
        method: 'POST',
        body: 'code=test-code&state=test-state',
      })

      mockHandler.mockResolvedValue(new NextResponse(null, { status: 200 }))

      await POST(request, {})

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 NextAuth POST body:'),
        expect.stringContaining('test-code')
      )
    })

    it('devrait détecter les erreurs OAuth dans le body', async () => {
      const url = 'https://test.example.com/api/auth/callback/discord'
      const request = new Request(url, {
        method: 'POST',
        body: 'error=invalid_client&error_description=Invalid%20credentials',
      })

      mockHandler.mockResolvedValue(new NextResponse(null, { status: 200 }))

      await POST(request, {})

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ OAuth error detected in POST body:'),
        expect.objectContaining({
          error: 'invalid_client',
        })
      )
    })

    it('devrait gérer les erreurs et rediriger vers la page d\'erreur', async () => {
      const url = 'https://test.example.com/api/auth/callback/discord'
      const request = new Request(url, {
        method: 'POST',
        body: 'code=test',
      })

      const error = new Error('Discord OAuth error')
      mockHandler.mockRejectedValue(error)

      const response = await POST(request, {})

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(307) // Redirect
      const location = response.headers.get('location')
      expect(location).toContain('/api/auth/error')
    })
  })
})

