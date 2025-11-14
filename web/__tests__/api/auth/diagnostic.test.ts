import { GET } from '@/app/api/auth/diagnostic/route'
import { NextResponse } from 'next/server'

const originalEnv = process.env

describe('Auth Diagnostic API', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('devrait retourner les informations de diagnostic', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.checks.hasNextAuthUrl).toBe(true)
    expect(data.checks.hasNextAuthSecret).toBe(true)
    expect(data.checks.hasDiscordClientId).toBe(true)
    expect(data.checks.hasDiscordClientSecret).toBe(true)
  })

  it('devrait détecter les variables manquantes', async () => {
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET
    delete process.env.DISCORD_CLIENT_ID
    delete process.env.DISCORD_CLIENT_SECRET

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.checks.hasNextAuthUrl).toBe(false)
    expect(data.checks.hasNextAuthSecret).toBe(false)
    expect(data.checks.hasDiscordClientId).toBe(false)
    expect(data.checks.hasDiscordClientSecret).toBe(false)
  })

  it('devrait valider le format de NEXTAUTH_URL', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.urlValidation.isValid).toBe(true)
  })

  it('devrait détecter un NEXTAUTH_URL invalide (avec slash à la fin)', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com/'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.urlValidation.isValid).toBe(false)
    expect(data.urlValidation.hasTrailingSlash).toBe(true)
  })

  it('devrait détecter un NEXTAUTH_URL invalide (http au lieu de https)', async () => {
    process.env.NEXTAUTH_URL = 'http://test.example.com'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.urlValidation.isValid).toBe(false)
    expect(data.urlValidation.hasHttps).toBe(false)
  })

  it('devrait valider la longueur de NEXTAUTH_SECRET', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.additionalChecks.nextAuthSecretValid).toBe(true)
  })

  it('devrait détecter un NEXTAUTH_SECRET trop court', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com'
    process.env.NEXTAUTH_SECRET = 'short'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.additionalChecks.nextAuthSecretValid).toBe(false)
  })

  it('devrait retourner l\'URL de callback attendue', async () => {
    process.env.NEXTAUTH_URL = 'https://test.example.com'
    process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
    process.env.DISCORD_CLIENT_ID = '123456789012345678'
    process.env.DISCORD_CLIENT_SECRET = 'test-secret-key-at-least-32-characters-long'

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.checks.expectedCallbackUrl).toBe('https://test.example.com/api/auth/callback/discord')
  })

  it('devrait retourner des recommandations si des variables manquent', async () => {
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    jest.resetModules()
    const { GET: getDiagnostic } = require('@/app/api/auth/diagnostic/route')
    
    const response = await getDiagnostic()
    const data = await response.json()

    expect(data.recommendations.length).toBeGreaterThan(0)
    expect(data.recommendations.some((r: string) => r.includes('NEXTAUTH_URL'))).toBe(true)
    expect(data.recommendations.some((r: string) => r.includes('NEXTAUTH_SECRET'))).toBe(true)
  })
})

