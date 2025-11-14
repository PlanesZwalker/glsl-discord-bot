import { authOptions } from '@/lib/auth'

// Mock environment variables
const originalEnv = process.env

describe('Auth Configuration', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Environment Variables', () => {
    it('devrait avoir les variables d\'environnement requises', () => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-client-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'

      // Re-import pour que les variables soient prises en compte
      const { authOptions: options } = require('@/lib/auth')
      
      expect(options).toBeDefined()
      expect(options.providers).toBeDefined()
      expect(options.providers.length).toBeGreaterThan(0)
    })

    it('devrait configurer DiscordProvider avec les bonnes variables', () => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id-123'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret-123'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'

      jest.resetModules()
      const { authOptions: options } = require('@/lib/auth')
      
      const discordProvider = options.providers.find((p: any) => p.id === 'discord')
      expect(discordProvider).toBeDefined()
      expect(discordProvider?.clientId).toBe('test-client-id-123')
      expect(discordProvider?.clientSecret).toBe('test-secret-123')
    })

    it('devrait configurer les scopes OAuth correctement', () => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'

      jest.resetModules()
      const { authOptions: options } = require('@/lib/auth')
      
      const discordProvider = options.providers.find((p: any) => p.id === 'discord')
      expect(discordProvider?.authorization?.params?.scope).toBe('identify email')
    })
  })

  describe('Callbacks', () => {
    beforeEach(() => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'
      jest.resetModules()
    })

    it('devrait rejeter la connexion si account est manquant', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const result = await options.callbacks.signIn({
        user: { id: '123', email: 'test@example.com' },
        account: null,
        profile: null,
      })

      expect(result).toBe(false)
    })

    it('devrait rejeter la connexion si le provider n\'est pas discord', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const result = await options.callbacks.signIn({
        user: { id: '123', email: 'test@example.com' },
        account: { provider: 'github', type: 'oauth' },
        profile: null,
      })

      expect(result).toBe(false)
    })

    it('devrait accepter la connexion avec un compte Discord valide', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const result = await options.callbacks.signIn({
        user: { id: '123', email: 'test@example.com' },
        account: { 
          provider: 'discord', 
          type: 'oauth',
          access_token: 'test-token',
        },
        profile: { id: '123', username: 'testuser' },
      })

      expect(result).toBe(true)
    })

    it('devrait créer un token JWT avec les informations du compte', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const token = await options.callbacks.jwt({
        token: {},
        account: {
          provider: 'discord',
          access_token: 'test-access-token',
          providerAccountId: '123',
        },
        profile: {
          id: '123',
          username: 'testuser',
        },
      })

      expect(token.accessToken).toBe('test-access-token')
      expect(token.providerAccountId).toBe('123')
      expect(token.id).toBe('123')
    })

    it('devrait créer une session avec les informations utilisateur', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const session = await options.callbacks.session({
        session: {
          user: {
            name: 'testuser',
            email: 'test@example.com',
          },
        },
        token: {
          sub: '123',
          id: '123',
          accessToken: 'test-token',
        },
      })

      expect(session.user.id).toBe('123')
      expect(session.accessToken).toBe('test-token')
    })
  })

  describe('Profile Callback', () => {
    beforeEach(() => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'
      jest.resetModules()
    })

    it('devrait transformer le profil Discord correctement', () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const discordProvider = options.providers.find((p: any) => p.id === 'discord')
      const profile = discordProvider.profile(
        {
          id: '123456789',
          username: 'testuser',
          email: 'test@example.com',
          avatar: 'abc123',
        },
        {
          access_token: 'test-token',
        }
      )

      expect(profile.id).toBe('123456789')
      expect(profile.name).toBe('testuser')
      expect(profile.email).toBe('test@example.com')
      expect(profile.image).toBe('https://cdn.discordapp.com/avatars/123456789/abc123.png')
    })

    it('devrait gérer un profil sans avatar', () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const discordProvider = options.providers.find((p: any) => p.id === 'discord')
      const profile = discordProvider.profile(
        {
          id: '123456789',
          username: 'testuser',
          email: 'test@example.com',
          avatar: null,
        },
        {
          access_token: 'test-token',
        }
      )

      expect(profile.image).toBeNull()
    })

    it('devrait logger les erreurs de tokens Discord', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const { authOptions: options } = require('@/lib/auth')
      
      const discordProvider = options.providers.find((p: any) => p.id === 'discord')
      discordProvider.profile(
        {
          id: '123456789',
          username: 'testuser',
          email: 'test@example.com',
        },
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        }
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Discord OAuth token error:'),
        expect.objectContaining({
          error: 'invalid_client',
        })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Redirect Callback', () => {
    beforeEach(() => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'
      jest.resetModules()
    })

    it('devrait rediriger vers /dashboard par défaut', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const redirect = await options.callbacks.redirect({
        url: undefined,
        baseUrl: 'https://test.example.com',
      })

      expect(redirect).toBe('https://test.example.com/dashboard')
    })

    it('devrait rediriger vers l\'URL relative fournie', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const redirect = await options.callbacks.redirect({
        url: '/custom-page',
        baseUrl: 'https://test.example.com',
      })

      expect(redirect).toBe('https://test.example.com/custom-page')
    })

    it('devrait rediriger vers l\'URL absolue si même origine', async () => {
      const { authOptions: options } = require('@/lib/auth')
      
      const redirect = await options.callbacks.redirect({
        url: 'https://test.example.com/custom-page',
        baseUrl: 'https://test.example.com',
      })

      expect(redirect).toBe('https://test.example.com/custom-page')
    })
  })

  describe('Error Events', () => {
    beforeEach(() => {
      process.env.DISCORD_CLIENT_ID = 'test-client-id'
      process.env.DISCORD_CLIENT_SECRET = 'test-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'
      process.env.NEXTAUTH_URL = 'https://test.example.com'
      jest.resetModules()
    })

    it('devrait logger les erreurs d\'authentification', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const { authOptions: options } = require('@/lib/auth')
      
      await options.events.error({
        error: new Error('Test error'),
        message: 'Test error message',
        provider: 'discord',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ NextAuth error event:'),
        expect.objectContaining({
          provider: 'discord',
        })
      )

      consoleSpy.mockRestore()
    })

    it('devrait logger les détails spécifiques Discord en cas d\'erreur Discord', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const { authOptions: options } = require('@/lib/auth')
      
      await options.events.error({
        error: new Error('Discord OAuth error'),
        message: 'Discord authentication failed',
        provider: 'discord',
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ Discord OAuth error details:'),
        expect.objectContaining({
          hasClientSecret: true,
        })
      )

      consoleSpy.mockRestore()
    })
  })
})

