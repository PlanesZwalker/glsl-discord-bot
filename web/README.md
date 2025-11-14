# GLSL Discord Bot - Web Dashboard

Landing page and dashboard for the GLSL Discord Bot, built with Next.js and deployed on Vercel.

## Features

- 🌍 Bilingual support (English/French)
- 🔐 Discord OAuth2 authentication
- 📊 Dashboard to view user shaders
- 🎨 Beautiful, modern UI
- 📱 Responsive design

## Setup

1. Install dependencies:
```bash
cd web
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your Discord OAuth credentials:
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

## Environment Variables

- `DISCORD_CLIENT_ID` - Your Discord application client ID
- `DISCORD_CLIENT_SECRET` - Your Discord application client secret
- `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000` or `https://yourdomain.com`)
- `NEXTAUTH_SECRET` - A random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_BOT_INVITE_URL` - Bot invite URL (optional)
- `NEXT_PUBLIC_DISCORD_CLIENT_ID` - Public Discord client ID for invite URL generation

## Deployment on Vercel

1. Push your code to GitHub
2. Import your repository on Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy!

The app will automatically build and deploy.

## Project Structure

- `app/` - Next.js app router pages and API routes
- `components/` - React components
- `lib/` - Utility functions and i18n
- `hooks/` - Custom React hooks

