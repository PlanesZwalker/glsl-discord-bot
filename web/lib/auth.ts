import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

// Validate required environment variables
const requiredEnvVars = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
}

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  console.error('Please set these variables in your Vercel dashboard or .env.local file')
}

// Validate Discord OAuth configuration
const discordClientId = process.env.DISCORD_CLIENT_ID || ''
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET || ''
const nextAuthUrl = process.env.NEXTAUTH_URL || ''

if (!discordClientId || !discordClientSecret) {
  console.warn('⚠️ Discord OAuth credentials are missing. Authentication will not work.')
}

if (!nextAuthUrl) {
  console.warn('⚠️ NEXTAUTH_URL is not set. This may cause authentication issues.')
} else {
  console.log('✅ NEXTAUTH_URL:', nextAuthUrl)
  console.log('✅ Expected callback URL:', `${nextAuthUrl}/api/auth/callback/discord`)
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
      // Note: Scopes are requested in the OAuth flow, not "enabled" in Discord Developer Portal
      // Discord automatically grants these scopes if the application has OAuth2 enabled
      // If scopes are missing, Discord will return an error like "invalid_scope" or "access_denied"
      // Add better error handling
      checks: ['state', 'pkce'],
      // Add profile callback to capture Discord API errors
      profile(profile: any, tokens: any) {
        console.log('🔍 Discord profile callback:', {
          hasProfile: !!profile,
          hasTokens: !!tokens,
          profileId: profile?.id,
          profileUsername: profile?.username,
          hasAccessToken: !!tokens?.access_token,
          tokenError: tokens?.error,
          tokenErrorDescription: tokens?.error_description,
        })
        
        // Log any errors from Discord OAuth
        if (tokens?.error) {
          console.error('❌ Discord OAuth token error:', {
            error: tokens.error,
            errorDescription: tokens.error_description,
            errorUri: tokens.error_uri,
          })
          // If there's a token error, throw to prevent authentication
          throw new Error(`Discord OAuth token error: ${tokens.error} - ${tokens.error_description || 'No description'}`)
        }
        
        // Validate profile exists
        if (!profile) {
          console.error('❌ Discord profile is missing')
          throw new Error('Discord profile is missing')
        }
        
        // Validate required profile fields
        if (!profile.id) {
          console.error('❌ Discord profile missing id')
          throw new Error('Discord profile missing id')
        }
        
        return {
          id: profile.id,
          name: profile.username || profile.global_name || 'Unknown',
          email: profile.email || null,
          image: profile.avatar 
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile, email }: any) {
      // Log sign-in attempts for debugging (always log in production for OAuth issues)
      console.log('🔐 Sign-in attempt:', {
        userId: user?.id,
        email: user?.email || email,
        hasAccount: !!account,
        hasProfile: !!profile,
        accountProvider: account?.provider,
        accountType: account?.type,
      })
      
      // Validate OAuth account
      if (!account) {
        console.error('❌ OAuth account is missing. Check Discord OAuth configuration.')
        console.error('❌ This usually means Discord OAuth callback failed or credentials are incorrect.')
        console.error('❌ Possible causes:')
        console.error('   1. DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET incorrect in Vercel')
        console.error('   2. Discord application not verified (check Verification Status in Discord Developer Portal)')
        console.error('   3. Callback URL mismatch between Discord and NEXTAUTH_URL')
        console.error('   4. OAuth2 not enabled in Discord application')
        return false
      }
      
      // Validate account provider
      if (account.provider !== 'discord') {
        console.error(`❌ Unexpected provider: ${account.provider}. Expected 'discord'.`)
        return false
      }
      
      // Log successful account validation
      console.log('✅ OAuth account validated successfully:', {
        provider: account.provider,
        type: account.type,
        accessToken: account.access_token ? 'present' : 'missing',
        refreshToken: account.refresh_token ? 'present' : 'missing',
      })
      
      // Allow all sign-ins (you can add custom logic here)
      return true
    },
    async jwt({ token, account, profile }: any) {
      // Log JWT callback for debugging
      if (account) {
        console.log('🔑 JWT callback with account:', {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
        })
      }
      
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.providerAccountId = account.providerAccountId
      }
      if (profile) {
        token.id = profile.id || profile.sub
      }
      return token
    },
    async session({ session, token }: any) {
      // Send properties to the client
      if (session?.user) {
        session.user.id = token.sub || token.id || token.userId
        session.accessToken = token.accessToken
      }
      return session
    },
    async redirect({ url, baseUrl }: any) {
      // Log redirect for debugging (always log in production for debugging)
      console.log('🔄 Redirect callback:', { url, baseUrl, urlType: typeof url })
      
      try {
        // If url is provided and is a valid callback URL, use it
        if (url) {
          // Check if url contains callbackUrl parameter
          try {
            const urlObj = new URL(url, baseUrl)
            const callbackUrlParam = urlObj.searchParams.get('callbackUrl')
            if (callbackUrlParam) {
              const decodedCallbackUrl = decodeURIComponent(callbackUrlParam)
              const finalUrl = decodedCallbackUrl.startsWith('/') 
                ? `${baseUrl}${decodedCallbackUrl}` 
                : decodedCallbackUrl
              console.log('✅ Redirecting to callbackUrl from URL:', finalUrl)
              return finalUrl
            }
          } catch (e) {
            // URL parsing failed, continue with normal logic
          }
          
          // Allows relative callback URLs (e.g., /dashboard)
          if (url.startsWith('/')) {
            const redirectUrl = `${baseUrl}${url}`
            console.log('✅ Redirecting to relative URL:', redirectUrl)
            return redirectUrl
          }
          
          // Allows callback URLs on the same origin
          try {
            const urlObj = new URL(url)
            if (urlObj.origin === baseUrl) {
              // Check if the URL has callbackUrl parameter to extract the actual destination
              const callbackParam = urlObj.searchParams.get('callbackUrl')
              if (callbackParam) {
                // Decode the callbackUrl parameter
                const decodedCallback = decodeURIComponent(callbackParam)
                const cleanUrl = decodedCallback.startsWith('/') 
                  ? `${baseUrl}${decodedCallback}`
                  : `${baseUrl}/${decodedCallback}`
                console.log('✅ Extracting callbackUrl from redirect URL:', cleanUrl)
                return cleanUrl
              }
              // If URL is just the home page, check if we should redirect to dashboard
              if (urlObj.pathname === '/' || urlObj.pathname === '') {
                // Default to dashboard if no specific callback
                console.log('⚠️ Home page detected, redirecting to dashboard')
                return `${baseUrl}/dashboard`
              }
              console.log('✅ Redirecting to same-origin URL:', url)
              return url
            } else {
              console.warn('⚠️ URL origin mismatch:', { urlOrigin: urlObj.origin, baseUrl })
            }
          } catch (e) {
            // Invalid URL, fall through to default
            console.warn('⚠️ Invalid URL in redirect:', url, e)
          }
        }
        
        // If no URL provided, default to dashboard (user likely wants to go there after sign-in)
        if (!url || url === baseUrl || url === `${baseUrl}/`) {
          console.log('⚠️ No callback URL provided, redirecting to dashboard')
          return `${baseUrl}/dashboard`
        }
        
        // Default: redirect to dashboard
        console.log('⚠️ No valid callback URL, redirecting to dashboard')
        return `${baseUrl}/dashboard`
      } catch (error: any) {
        console.error('❌ Error in redirect callback:', error)
        console.error('❌ Redirect error details:', {
          message: error.message,
          stack: error.stack,
          url,
          baseUrl
        })
        // Fallback to dashboard on error
        return `${baseUrl}/dashboard`
      }
    },
  },
  pages: {
    signIn: '/',
    error: '/api/auth/error',
  },
  debug: true, // Always enable debug for better error logging
  // Add session configuration
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Add secret validation
  secret: process.env.NEXTAUTH_SECRET,
  // Cookie configuration - important for OAuth state management
  // Note: Don't set domain explicitly - let NextAuth use the default (current domain)
  // Setting domain to '.vercel.app' can cause issues with state management
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS only)
        // Don't set domain - use default (current domain)
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax', // Use 'lax' to allow cross-site redirects from Discord OAuth
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes - enough time for OAuth flow
        // Don't set domain - use default (current domain)
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Don't set domain - use default (current domain)
      },
    },
  },
  // Trust proxy for Vercel - important for correct URL handling
  trustHost: true,
  // Add event logger to capture all authentication events and errors
  events: {
    async signIn({ user, account, profile, isNewUser }: any) {
      console.log('📝 NextAuth signIn event:', {
        userId: user?.id,
        email: user?.email,
        hasAccount: !!account,
        hasProfile: !!profile,
        isNewUser,
        accountProvider: account?.provider,
      })
    },
    async signOut({ session, token }: any) {
      console.log('📝 NextAuth signOut event:', {
        hasSession: !!session,
        hasToken: !!token,
      })
    },
    async createUser({ user }: any) {
      console.log('📝 NextAuth createUser event:', {
        userId: user?.id,
        email: user?.email,
      })
    },
    async updateUser({ user }: any) {
      console.log('📝 NextAuth updateUser event:', {
        userId: user?.id,
      })
    },
    async linkAccount({ user, account, profile }: any) {
      console.log('📝 NextAuth linkAccount event:', {
        userId: user?.id,
        accountProvider: account?.provider,
      })
    },
    async session({ session, token }: any) {
      // Log session events for debugging
      if (!session) {
        console.warn('⚠️ NextAuth session event: session is null/undefined')
      }
    },
    async error({ error, message, provider }: any) {
      // This is the key event for capturing authentication errors
      console.error('❌ NextAuth error event:', {
        error: error?.message || error,
        message,
        provider,
        errorType: error?.type,
        errorCode: error?.code,
        errorStack: error?.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })
      
      // Log additional Discord-specific error information
      if (provider === 'discord' || message?.includes('discord') || message?.includes('Discord')) {
        console.error('❌ Discord OAuth error details:', {
          clientId: discordClientId ? `${discordClientId.substring(0, 10)}...` : 'MISSING',
          hasClientSecret: !!discordClientSecret,
          nextAuthUrl,
          expectedCallbackUrl: `${nextAuthUrl}/api/auth/callback/discord`,
          errorMessage: error?.message,
          errorType: error?.type,
          errorCode: error?.code,
        })
      }
    },
  },
  // Add logger for better debugging
  logger: {
    error(code: string, ...args: any[]) {
      console.error(`❌ NextAuth error [${code}]:`, ...args)
    },
    warn(code: string, ...args: any[]) {
      console.warn(`⚠️ NextAuth warning [${code}]:`, ...args)
    },
    debug(code: string, ...args: any[]) {
      console.log(`🔍 NextAuth debug [${code}]:`, ...args)
    },
  },
}

