'use client'

// Force dynamic rendering - cette page nécessite des paramètres de requête dynamiques
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import { useLocale } from '@/hooks/useLocale'
import Link from 'next/link'
import { Suspense, useState, useEffect } from 'react'

function LoadingFallback() {
  const { locale } = useLocale()
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-4">
          {locale === 'fr' ? 'Chargement...' : 'Loading...'}
        </h1>
      </div>
    </div>
  )
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const { locale } = useLocale()
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [loadingDiagnostic, setLoadingDiagnostic] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState<string>('')
  
  // Capture all URL parameters for debugging
  const allParams: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    params.forEach((value, key) => {
      allParams[key] = value
    })
  }

  // Set callback URL only on client side to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin
      setCallbackUrl(`${origin}/api/auth/callback/discord`)
    }
  }, [])

  // Fetch diagnostic on mount for any error (including unknown)
  useEffect(() => {
    // Always fetch diagnostic for any authentication error
    setLoadingDiagnostic(true)
    fetch('/api/auth/diagnostic')
      .then(res => res.json())
      .then(data => {
        setDiagnostic(data)
        setLoadingDiagnostic(false)
      })
      .catch(err => {
        console.error('Failed to fetch diagnostic:', err)
        setLoadingDiagnostic(false)
      })
  }, [error])

  const getErrorMessage = () => {
    switch (error) {
      case 'Configuration':
        return locale === 'fr'
          ? 'Erreur de configuration NextAuth. Vérifiez que toutes les variables d\'environnement sont définies dans Vercel.'
          : 'NextAuth configuration error. Please check that all environment variables are set in Vercel.'
      case 'AccessDenied':
        return locale === 'fr'
          ? 'Accès refusé. Vous devez autoriser l\'application Discord.'
          : 'Access denied. You must authorize the Discord application.'
      case 'Verification':
        return locale === 'fr'
          ? 'Erreur de vérification. Le token Discord est invalide ou expiré.'
          : 'Verification error. Discord token is invalid or expired.'
      case 'OAuthSignin':
        return locale === 'fr'
          ? 'Erreur lors de la connexion avec Discord. Vérifiez que l\'URL de callback est correctement configurée dans Discord Developer Portal.'
          : 'Error signing in with Discord. Please check that the callback URL is correctly configured in Discord Developer Portal.'
      case 'OAuthCallback':
        // Check for specific OAuth errors
        const errorDetails = searchParams.get('error_description') || ''
        const errorCode = searchParams.get('error') || ''
        
        if (errorDetails.includes('state missing') || errorDetails.includes('state') || errorCode.includes('state')) {
          return locale === 'fr'
            ? 'Erreur OAuth: le paramètre "state" est manquant dans la réponse Discord. Cela indique généralement un problème avec les cookies ou la session. Vérifiez que les cookies sont activés dans votre navigateur et que vous n\'utilisez pas de mode privé.'
            : 'OAuth error: "state" parameter is missing from Discord response. This usually indicates a cookie or session issue. Make sure cookies are enabled in your browser and you\'re not using private/incognito mode.'
        }
        
        if (errorDetails.includes('invalid_client') || errorCode.includes('invalid_client')) {
          return locale === 'fr'
            ? 'Erreur OAuth: "invalid_client" - Discord rejette les identifiants (Client ID ou Client Secret). Vérifiez que DISCORD_CLIENT_ID et DISCORD_CLIENT_SECRET dans Vercel correspondent exactement à ceux de votre application Discord. Si vous avez régénéré le Client Secret dans Discord, mettez-le à jour dans Vercel.'
            : 'OAuth error: "invalid_client" - Discord is rejecting the credentials (Client ID or Client Secret). Verify that DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in Vercel exactly match those in your Discord application. If you regenerated the Client Secret in Discord, update it in Vercel.'
        }
        
        // Check for "Application inconnue" / "Unknown application" error
        if (errorDetails.toLowerCase().includes('application inconnue') || 
            errorDetails.toLowerCase().includes('unknown application') ||
            errorDetails.toLowerCase().includes('application unknown')) {
          // Note: callbackUrl will be set dynamically in useEffect, so we use a generic message here
          return locale === 'fr'
            ? 'Erreur OAuth: "Application inconnue" - Discord ne reconnaît pas votre application. Vérifiez que: 1) DISCORD_CLIENT_ID correspond exactement au Client ID dans Discord Developer Portal (section OAuth2), 2) DISCORD_CLIENT_SECRET correspond au Client Secret, 3) OAuth2 est activé dans votre application Discord, 4) L\'URL de callback dans Discord correspond exactement à celle affichée ci-dessous.'
            : 'OAuth error: "Unknown application" - Discord does not recognize your application. Verify that: 1) DISCORD_CLIENT_ID exactly matches the Client ID in Discord Developer Portal (OAuth2 section), 2) DISCORD_CLIENT_SECRET matches the Client Secret, 3) OAuth2 is enabled in your Discord application, 4) The callback URL in Discord matches exactly the one shown below.'
        }
        
        return locale === 'fr'
          ? 'Erreur lors du callback OAuth. Si l\'URL de callback est déjà correcte dans Discord, vérifiez les variables d\'environnement dans Vercel (NEXTAUTH_URL, NEXTAUTH_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET).'
          : 'OAuth callback error. If the callback URL is already correct in Discord, check the environment variables in Vercel (NEXTAUTH_URL, NEXTAUTH_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET).'
      case 'OAuthCreateAccount':
        return locale === 'fr'
          ? 'Impossible de créer le compte. Vérifiez les permissions de l\'application Discord.'
          : 'Unable to create account. Please check Discord application permissions.'
      case 'EmailCreateAccount':
        return locale === 'fr'
          ? 'Impossible de créer le compte avec cet email.'
          : 'Unable to create account with this email.'
      case 'Callback':
        return locale === 'fr'
          ? 'Erreur lors du callback. Vérifiez la configuration Discord OAuth.'
          : 'Callback error. Please check Discord OAuth configuration.'
      case 'OAuthAccountNotLinked':
        return locale === 'fr'
          ? 'Ce compte Discord est déjà lié à un autre compte.'
          : 'This Discord account is already linked to another account.'
      case 'EmailSignin':
        return locale === 'fr'
          ? 'Erreur lors de l\'envoi de l\'email de connexion.'
          : 'Error sending sign-in email.'
      case 'CredentialsSignin':
        return locale === 'fr'
          ? 'Identifiants invalides.'
          : 'Invalid credentials.'
      case 'SessionRequired':
        return locale === 'fr'
          ? 'Vous devez être connecté pour accéder à cette page.'
          : 'You must be signed in to access this page.'
      default:
        // For unknown errors, provide more helpful information
        if (error === 'unknown' || !error) {
          return locale === 'fr'
            ? 'Erreur d\'authentification inconnue. Causes possibles: 1) Problème avec les cookies/sessions (essayez en navigation privée ou un autre navigateur), 2) Client Secret Discord régénéré mais pas mis à jour dans Vercel, 3) Problème avec les scopes OAuth (identify, email), 4) Problème réseau ou CORS, 5) Configuration NextAuth incorrecte. Vérifiez les logs Vercel pour plus de détails sur l\'erreur exacte.'
            : 'Unknown authentication error. Possible causes: 1) Cookie/session issues (try incognito mode or different browser), 2) Discord Client Secret regenerated but not updated in Vercel, 3) OAuth scopes issue (identify, email), 4) Network or CORS issues, 5) NextAuth configuration issue. Check Vercel logs for more details on the exact error.'
        }
        return locale === 'fr'
          ? `Une erreur est survenue lors de l'authentification. (Code: ${error})`
          : `An error occurred during authentication. (Code: ${error})`
    }
  }

  const getMissingVars = () => {
    return [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'DISCORD_CLIENT_ID',
      'DISCORD_CLIENT_SECRET',
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-4">
          {locale === 'fr' ? 'Erreur d\'authentification' : 'Authentication Error'}
        </h1>
        
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300">{getErrorMessage()}</p>
        </div>

        {/* Show all URL parameters for debugging (especially for unknown errors) */}
        {(error === 'unknown' || !error) && Object.keys(allParams).length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-yellow-300 mb-3">
              {locale === 'fr' ? 'Paramètres URL (débogage):' : 'URL Parameters (Debug):'}
            </h2>
            <div className="space-y-2">
              {Object.entries(allParams).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-yellow-200 font-mono font-semibold">{key}:</span>
                  <span className="text-yellow-100 font-mono ml-2">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-yellow-200 text-xs mt-3">
              {locale === 'fr' 
                ? 'Ces paramètres peuvent aider à identifier la cause de l\'erreur. Vérifiez les logs Vercel pour plus de détails.'
                : 'These parameters may help identify the error cause. Check Vercel logs for more details.'}
            </p>
          </div>
        )}

        {/* Always show diagnostic section for any error */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">
            {locale === 'fr' ? 'Variables d\'environnement requises:' : 'Required environment variables:'}
          </h2>
          
          {loadingDiagnostic ? (
            <div className="text-gray-400 text-sm mb-4">
              {locale === 'fr' ? 'Vérification de la configuration...' : 'Checking configuration...'}
            </div>
          ) : diagnostic ? (
              <div className="mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`p-2 rounded ${diagnostic.checks.hasNextAuthUrl ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                    NEXTAUTH_URL: {diagnostic.checks.hasNextAuthUrl ? '✅ Set' : '❌ Missing'}
                  </div>
                  <div className={`p-2 rounded ${diagnostic.checks.hasNextAuthSecret ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                    NEXTAUTH_SECRET: {diagnostic.checks.hasNextAuthSecret ? '✅ Set' : '❌ Missing'}
                  </div>
                  <div className={`p-2 rounded ${diagnostic.checks.hasDiscordClientId ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                    DISCORD_CLIENT_ID: {diagnostic.checks.hasDiscordClientId ? '✅ Set' : '❌ Missing'}
                  </div>
                  <div className={`p-2 rounded ${diagnostic.checks.hasDiscordClientSecret ? 'bg-green-900/20 text-green-300' : 'bg-red-900/20 text-red-300'}`}>
                    DISCORD_CLIENT_SECRET: {diagnostic.checks.hasDiscordClientSecret ? '✅ Set' : '❌ Missing'}
                  </div>
                </div>
                
                {diagnostic.urlValidation && (
                  <div className={`border rounded p-3 ${diagnostic.urlValidation.isValid ? 'bg-green-900/20 border-green-700' : 'bg-yellow-900/20 border-yellow-700'}`}>
                    <p className={`text-sm font-semibold mb-1 ${diagnostic.urlValidation.isValid ? 'text-green-300' : 'text-yellow-300'}`}>
                      {diagnostic.urlValidation.isValid ? '✅' : '⚠️'} NEXTAUTH_URL Validation:
                    </p>
                    <p className={`text-sm ${diagnostic.urlValidation.isValid ? 'text-green-200' : 'text-yellow-200'}`}>
                      {diagnostic.urlValidation.message}
                    </p>
                    {!diagnostic.urlValidation.isValid && (
                      <>
                        <p className="text-yellow-200 text-xs mt-2 font-mono">
                          Current: "{diagnostic.checks.nextAuthUrl}"
                        </p>
                        <p className="text-yellow-200 text-xs font-mono">
                          Expected: "{diagnostic.urlValidation.expectedUrl}"
                        </p>
                        {diagnostic.urlValidation.hasTrailingSlash && (
                          <p className="text-yellow-300 text-xs mt-1 font-semibold">
                            ⚠️ Remove the trailing slash from NEXTAUTH_URL in Vercel
                          </p>
                        )}
                        {!diagnostic.urlValidation.hasHttps && (
                          <p className="text-yellow-300 text-xs mt-1 font-semibold">
                            ⚠️ Change http:// to https:// in NEXTAUTH_URL
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {diagnostic.additionalChecks && (
                  <div className="bg-gray-800 rounded p-3">
                    <p className="text-gray-300 text-sm font-semibold mb-2">
                      Additional Checks:
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className={diagnostic.additionalChecks.nextAuthSecretValid ? 'text-green-300' : 'text-yellow-300'}>
                        NEXTAUTH_SECRET length: {diagnostic.checks.nextAuthSecretLength} chars {diagnostic.additionalChecks.nextAuthSecretValid ? '✅' : '⚠️ (should be ≥32)'}
                      </div>
                      <div className={diagnostic.additionalChecks.discordClientIdFormat ? 'text-green-300' : 'text-yellow-300'}>
                        DISCORD_CLIENT_ID format: {diagnostic.additionalChecks.discordClientIdFormat ? '✅ Valid' : '⚠️ Check format'}
                      </div>
                      <div className={diagnostic.additionalChecks.discordClientSecretFormat ? 'text-green-300' : 'text-yellow-300'}>
                        DISCORD_CLIENT_SECRET length: {diagnostic.checks.discordClientSecretLength} chars {diagnostic.additionalChecks.discordClientSecretFormat ? '✅' : '⚠️ (should be ≥32)'}
                      </div>
                    </div>
                  </div>
                )}
                
                {diagnostic.recommendations && diagnostic.recommendations.length > 0 && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
                    <p className="text-blue-300 text-sm font-semibold mb-2">
                      {locale === 'fr' ? 'Recommandations:' : 'Recommendations:'}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-blue-200 text-sm">
                      {diagnostic.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {diagnostic.status === 'configured' && (
                  <div className="bg-purple-900/20 border border-purple-700 rounded p-3 mt-4">
                    <p className="text-purple-300 text-sm font-semibold mb-2">
                      🔍 Troubleshooting Steps:
                    </p>
                    {(error === 'OAuthCallback' && (searchParams.get('error_description')?.includes('state') || searchParams.get('error')?.includes('state'))) && (
                      <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3 mb-3">
                        <p className="text-yellow-300 text-sm font-semibold mb-2">
                          ⚠️ "State missing" Error - Cookie/Session Issue:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-yellow-200 text-xs">
                          <li>Make sure cookies are enabled in your browser</li>
                          <li>Try in a regular browser window (not private/incognito mode)</li>
                          <li>Clear cookies for this domain and try again</li>
                          <li>Make sure you're not blocking third-party cookies</li>
                          <li>Try a different browser or device</li>
                          <li>Check browser console for cookie-related errors</li>
                        </ol>
                      </div>
                    )}
                    
                    {/* Show troubleshooting steps for unknown errors */}
                    {(error === 'unknown' || !error) && (
                      <div className="bg-blue-900/30 border border-blue-600 rounded p-3 mb-3">
                        <p className="text-blue-300 text-sm font-semibold mb-2">
                          🔍 Causes Probables de l'Erreur "Unknown":
                        </p>
                        <ol className="list-decimal list-inside space-y-2 text-blue-200 text-xs">
                          <li>
                            <strong>{locale === 'fr' ? 'Client Secret Discord régénéré:' : 'Discord Client Secret regenerated:'}</strong>
                            <br />
                            {locale === 'fr'
                              ? 'Si vous avez régénéré le Client Secret dans Discord mais ne l\'avez pas mis à jour dans Vercel, l\'authentification échouera. Vérifiez que DISCORD_CLIENT_SECRET dans Vercel correspond exactement au Client Secret actuel dans Discord.'
                              : 'If you regenerated the Client Secret in Discord but didn\'t update it in Vercel, authentication will fail. Verify that DISCORD_CLIENT_SECRET in Vercel exactly matches the current Client Secret in Discord.'}
                          </li>
                          <li>
                            <strong>{locale === 'fr' ? 'Problème avec les cookies/sessions:' : 'Cookie/session issues:'}</strong>
                            <br />
                            {locale === 'fr'
                              ? 'Essayez en navigation privée, un autre navigateur, ou videz les cookies. Les cookies peuvent être bloqués par des extensions de navigateur ou des paramètres de sécurité.'
                              : 'Try incognito mode, different browser, or clear cookies. Cookies may be blocked by browser extensions or security settings.'}
                          </li>
                          <li>
                            <strong>{locale === 'fr' ? 'Scopes OAuth incorrects:' : 'Incorrect OAuth scopes:'}</strong>
                            <br />
                            {locale === 'fr'
                              ? 'Les scopes "identify" et "email" sont demandés automatiquement dans le code. Vérifiez que OAuth2 est activé dans Discord Developer Portal → OAuth2 → General. Les scopes ne sont pas "activés" dans Discord, ils sont demandés lors de la requête OAuth. Si Discord rejette les scopes, vous verrez une erreur "invalid_scope" dans les logs, pas "unknown".'
                              : 'Scopes "identify" and "email" are automatically requested in the code. Verify that OAuth2 is enabled in Discord Developer Portal → OAuth2 → General. Scopes are not "enabled" in Discord, they are requested during the OAuth request. If Discord rejects the scopes, you will see an "invalid_scope" error in logs, not "unknown".'}
                          </li>
                          <li>
                            <strong>{locale === 'fr' ? 'Problème réseau/CORS:' : 'Network/CORS issues:'}</strong>
                            <br />
                            {locale === 'fr'
                              ? 'Vérifiez les logs Vercel pour des erreurs réseau. Les problèmes CORS peuvent empêcher le callback OAuth de fonctionner.'
                              : 'Check Vercel logs for network errors. CORS issues can prevent OAuth callback from working.'}
                          </li>
                          <li>
                            <strong>{locale === 'fr' ? 'Configuration NextAuth:' : 'NextAuth configuration:'}</strong>
                            <br />
                            {locale === 'fr'
                              ? 'Vérifiez que NEXTAUTH_URL correspond exactement à votre domaine Vercel (sans slash à la fin). Vérifiez aussi que NEXTAUTH_SECRET est correctement configuré.'
                              : 'Verify that NEXTAUTH_URL exactly matches your Vercel domain (no trailing slash). Also verify that NEXTAUTH_SECRET is correctly configured.'}
                          </li>
                        </ol>
                        <p className="text-blue-200 text-xs mt-3 font-semibold">
                          {locale === 'fr'
                            ? '💡 Action immédiate: Vérifiez les logs Vercel (Functions → Logs) pour voir l\'erreur exacte. Les logs contiennent maintenant plus de détails sur l\'erreur OAuth.'
                            : '💡 Immediate action: Check Vercel logs (Functions → Logs) to see the exact error. Logs now contain more details about the OAuth error.'}
                        </p>
                      </div>
                    )}
                    
                    {(error === 'OAuthCallback' && (searchParams.get('error_description')?.includes('invalid_client') || searchParams.get('error')?.includes('invalid_client'))) && (
                      <div className="bg-red-900/30 border border-red-600 rounded p-3 mb-3">
                        <p className="text-red-300 text-sm font-semibold mb-2">
                          ❌ "Invalid Client" Error - Credentials Issue:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-red-200 text-xs">
                          <li>
                            <strong>Go to Discord Developer Portal:</strong>
                            <br />
                            <span className="text-red-300 text-xs">https://discord.com/developers/applications</span>
                          </li>
                          <li>
                            <strong>Select your Discord application</strong>
                          </li>
                          <li>
                            <strong>Go to OAuth2 → General</strong>
                          </li>
                          <li>
                            <strong>Compare Client ID:</strong> The Client ID shown in Discord must EXACTLY match DISCORD_CLIENT_ID in Vercel (no spaces, no extra characters)
                          </li>
                          <li>
                            <strong>Reset and copy Client Secret:</strong>
                            <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                              <li>Click "Reset Secret" in Discord (if needed)</li>
                              <li>Copy the ENTIRE Client Secret (it should be 32+ characters)</li>
                              <li>Go to Vercel → Settings → Environment Variables</li>
                              <li>Update DISCORD_CLIENT_SECRET with the new value</li>
                              <li><strong>IMPORTANT:</strong> Make sure there are no spaces or line breaks</li>
                            </ol>
                          </li>
                          <li>
                            <strong>Redeploy the application</strong> after updating the variables
                          </li>
                          <li>
                            <strong>Double-check:</strong> Make sure you're using the Client ID and Secret from the SAME Discord application
                          </li>
                        </ol>
                      </div>
                    )}
                    <ol className="list-decimal list-inside space-y-2 text-purple-200 text-sm">
                      <li>
                        Check Vercel logs for detailed error messages:
                        <br />
                        <span className="text-purple-300 text-xs font-mono">
                          Vercel Dashboard → Project → Deployments → [Latest] → Functions → Logs
                        </span>
                      </li>
                      <li>
                        Verify Discord Client ID/Secret match your Discord app:
                        <br />
                        <span className="text-purple-300 text-xs">
                          Go to Discord Developer Portal → Your App → OAuth2 → Compare Client ID and reset/verify Client Secret
                        </span>
                      </li>
                      <li>
                        Try regenerating NEXTAUTH_SECRET:
                        <br />
                        <span className="text-purple-300 text-xs font-mono">
                          openssl rand -base64 32
                        </span>
                      </li>
                      <li>
                        Verify callback URL in Discord has no trailing slash and matches exactly:
                        <br />
                        <span className="text-purple-300 text-xs font-mono break-all">
                          {callbackUrl || 'Loading...'}
                        </span>
                      </li>
                      <li>
                        Check that your Discord app has the correct scopes enabled (identify, email)
                      </li>
                    </ol>
                  </div>
                )}
                
                <div className="bg-gray-800 rounded p-3">
                  <p className="text-gray-300 text-xs font-semibold mb-1">
                    Expected Callback URL:
                  </p>
                  <p className="text-gray-200 text-xs font-mono break-all">
                    {diagnostic.checks.expectedCallbackUrl}
                  </p>
                </div>
              </div>
            ) : (
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                {getMissingVars().map((varName) => (
                  <li key={varName} className="font-mono text-sm">
                    {varName}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
              <p className="text-blue-300 text-sm font-semibold mb-2">
                {locale === 'fr'
                  ? 'Configuration Discord OAuth:'
                  : 'Discord OAuth Configuration:'}
              </p>
              <ol className="list-decimal list-inside mt-2 text-blue-300 text-sm space-y-2">
                <li>
                  {locale === 'fr'
                    ? 'Allez sur https://discord.com/developers/applications'
                    : 'Go to https://discord.com/developers/applications'}
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Sélectionnez votre application Discord'
                    : 'Select your Discord application'}
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Allez dans OAuth2 → General'
                    : 'Go to OAuth2 → General'}
                </li>
                <li>
                  {locale === 'fr'
                    ? `Ajoutez l'URL de callback exacte:`
                    : `Add the exact callback URL:`}
                  <div className="mt-2 p-2 bg-gray-800 rounded font-mono text-xs text-blue-200 break-all">
                    {callbackUrl || 'Loading...'}
                  </div>
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Copiez le Client ID et Client Secret dans les variables d\'environnement Vercel'
                    : 'Copy Client ID and Client Secret to Vercel environment variables'}
                </li>
              </ol>
            </div>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
              <p className="text-yellow-300 text-sm font-semibold mb-2">
                {locale === 'fr'
                  ? '⚠️ Important: L\'URL de callback dans Discord doit correspondre EXACTEMENT à:'
                  : '⚠️ Important: The callback URL in Discord must EXACTLY match:'}
              </p>
              <div className="mt-2 p-2 bg-gray-800 rounded font-mono text-sm text-yellow-200 break-all">
                {callbackUrl || 'Loading...'}
              </div>
              <p className="text-yellow-300 text-xs mt-2">
                {locale === 'fr'
                  ? '(Incluez le https:// et ne mettez PAS de slash à la fin)'
                  : '(Include https:// and do NOT add a trailing slash)'}
              </p>
              <p className="text-yellow-300 text-xs mt-2 font-semibold">
                {locale === 'fr'
                  ? '💡 Si cette URL est déjà configurée dans Discord, le problème vient probablement des variables d\'environnement dans Vercel. Vérifiez le diagnostic ci-dessus.'
                  : '💡 If this URL is already configured in Discord, the issue is likely with environment variables in Vercel. Check the diagnostic above.'}
              </p>
            </div>
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
              <p className="text-blue-300 text-sm font-semibold mb-2">
                {locale === 'fr'
                  ? 'Pour configurer les variables dans Vercel:'
                  : 'To configure variables in Vercel:'}
              </p>
              <ol className="list-decimal list-inside mt-2 text-blue-300 text-sm space-y-1">
                <li>
                  {locale === 'fr'
                    ? 'Allez dans votre projet Vercel'
                    : 'Go to your Vercel project'}
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Settings → Environment Variables'
                    : 'Settings → Environment Variables'}
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Ajoutez chaque variable avec sa valeur'
                    : 'Add each variable with its value'}
                </li>
                <li>
                  {locale === 'fr'
                    ? 'Redéployez l\'application'
                    : 'Redeploy the application'}
                </li>
              </ol>
            </div>
          </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-discord-blurple hover:bg-discord-blurple-dark text-white font-semibold rounded-lg transition-colors"
          >
            {locale === 'fr' ? 'Retour à l\'accueil' : 'Back to home'}
          </Link>
          <Link
            href="/api/auth/signin"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            {locale === 'fr' ? 'Réessayer' : 'Try again'}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthErrorContent />
    </Suspense>
  )
}

