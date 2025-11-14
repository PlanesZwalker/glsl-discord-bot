export type Locale = 'en' | 'fr'

export const defaultLocale: Locale = 'en'

export const locales: Locale[] = ['en', 'fr']

export const translations = {
  en: {
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      install: 'Install Bot',
    },
    hero: {
      title: 'GLSL Shader Compiler for Discord',
      subtitle: 'Professional GLSL/WGSL shader compiler for Discord. Compile custom shaders, explore 100+ preset shaders, or generate shaders without coding. All with beautiful animated GIFs, web dashboard, and REST API.',
      cta: 'Add to Discord',
      ctaSecondary: 'View Dashboard',
    },
    features: {
      title: 'Features',
      compile: {
        title: 'Compile Shaders',
        desc: 'Compile GLSL or WGSL shaders and generate animated GIFs',
        details: 'Write your own shader code or use preset shaders. Supports textures (iChannel0-3) like Shadertoy. Generates beautiful 3-second animated GIFs at 30 FPS.',
        command: '/shader <code>',
        example: '/shader void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }',
      },
      presets: {
        title: '100 Presets',
        desc: 'Access 100 beautiful preset shaders with autocomplete',
        details: 'Choose from 100 professionally crafted preset shaders organized by categories: animated effects, natural phenomena, fractals (including 3 Mandelbulb variations), 3D effects, geometric patterns, space effects, and advanced visual effects.',
        command: '/shader-preset <preset>',
        example: '/shader-preset rainbow',
      },
      generate: {
        title: 'Generate Shaders',
        desc: 'Generate shaders using parameters: shape, color, animation',
        details: 'Create shaders without coding! Choose a shape (circle, square, triangle, star, heart, etc.), a color (red, blue, rainbow, warm, cool, etc.), and an animation type (rotation, pulse, wave, zoom, etc.).',
        command: '/shader-generate',
        example: '/shader-generate shape:circle color:blue animation:rotation',
      },
      code: {
        title: 'View Source',
        desc: 'View and learn from shader source code',
        details: 'Learn by exploring the source code of any preset shader. Perfect for understanding GLSL shader programming and creating your own variations.',
        command: '/shader-code <name>',
        example: '/shader-code rainbow',
      },
    },
    dashboard: {
      title: 'Your Shaders',
      empty: 'No shaders yet. Start creating!',
      loading: 'Loading your shaders...',
      name: 'Name',
      createdAt: 'Created',
      views: 'Views',
      likes: 'Likes',
      actions: 'Actions',
      view: 'View',
      delete: 'Delete',
      myShaders: 'My Shaders',
      createShader: 'Create Shader',
      generateShader: 'Generate Shader',
      presetShaders: 'Preset Shaders',
      statistics: 'Statistics',
    },
    install: {
      title: 'Install GLSL Discord Bot',
      subtitle: 'Add the bot to your Discord server',
      button: 'Add to Discord',
      steps: {
        title: 'Installation Steps',
        step1: 'Click the "Add to Discord" button',
        step2: 'Select your server',
        step3: 'Authorize the bot',
        step4: 'Start using /shader commands!',
      },
    },
    common: {
      signIn: 'Sign In',
      signOut: 'Sign Out',
      codeCopied: 'Code copied to clipboard!',
      footer: '© 2024 GLSL Discord Bot. Made with ❤️ for the shader community.',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      dashboard: 'Tableau de bord',
      install: 'Installer le Bot',
    },
    hero: {
      title: 'Compilateur de Shaders GLSL pour Discord',
      subtitle: 'Compilateur de shaders GLSL/WGSL professionnel pour Discord. Compilez des shaders personnalisés, explorez 100+ shaders prédéfinis, ou générez des shaders sans coder. Le tout avec de magnifiques GIFs animés, tableau de bord web et API REST.',
      cta: 'Ajouter à Discord',
      ctaSecondary: 'Voir le Tableau de bord',
    },
    features: {
      title: 'Fonctionnalités',
      compile: {
        title: 'Compiler des Shaders',
        desc: 'Compilez des shaders GLSL ou WGSL et générez des GIFs animés',
        details: 'Écrivez votre propre code shader ou utilisez des shaders prédéfinis. Supporte les textures (iChannel0-3) comme Shadertoy. Génère de magnifiques GIFs animés de 3 secondes à 30 FPS.',
        command: '/shader <code>',
        example: '/shader void mainImage(out vec4 fragColor, in vec2 fragCoord) { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }',
      },
      presets: {
        title: '100 Préréglages',
        desc: 'Accédez à 100 magnifiques shaders prédéfinis avec autocomplétion',
        details: 'Choisissez parmi 100 shaders prédéfinis professionnels organisés par catégories : effets animés, phénomènes naturels, fractales (dont 3 variations de Mandelbulb), effets 3D, motifs géométriques, effets spatiaux et effets visuels avancés.',
        command: '/shader-preset <preset>',
        example: '/shader-preset rainbow',
      },
      generate: {
        title: 'Générer des Shaders',
        desc: 'Générez des shaders en utilisant des paramètres : forme, couleur, animation',
        details: 'Créez des shaders sans coder ! Choisissez une forme (cercle, carré, triangle, étoile, cœur, etc.), une couleur (rouge, bleu, arc-en-ciel, chaud, froid, etc.) et un type d\'animation (rotation, pulsation, vague, zoom, etc.).',
        command: '/shader-generate',
        example: '/shader-generate shape:circle color:blue animation:rotation',
      },
      code: {
        title: 'Voir le Code Source',
        desc: 'Visualisez et apprenez à partir du code source des shaders',
        details: 'Apprenez en explorant le code source de n\'importe quel shader prédéfini. Parfait pour comprendre la programmation GLSL et créer vos propres variations.',
        command: '/shader-code <name>',
        example: '/shader-code rainbow',
      },
    },
    dashboard: {
      title: 'Vos Shaders',
      empty: 'Aucun shader pour le moment. Commencez à créer !',
      loading: 'Chargement de vos shaders...',
      name: 'Nom',
      createdAt: 'Créé le',
      views: 'Vues',
      likes: 'J\'aime',
      actions: 'Actions',
      view: 'Voir',
      delete: 'Supprimer',
      myShaders: 'Mes Shaders',
      createShader: 'Créer un Shader',
      generateShader: 'Générer un Shader',
      presetShaders: 'Shaders Prédéfinis',
      statistics: 'Statistiques',
    },
    install: {
      title: 'Installer le Bot GLSL Discord',
      subtitle: 'Ajoutez le bot à votre serveur Discord',
      button: 'Ajouter à Discord',
      steps: {
        title: 'Étapes d\'installation',
        step1: 'Cliquez sur le bouton "Ajouter à Discord"',
        step2: 'Sélectionnez votre serveur',
        step3: 'Autorisez le bot',
        step4: 'Commencez à utiliser les commandes /shader !',
      },
    },
    common: {
      signIn: 'Se connecter',
      signOut: 'Se déconnecter',
      codeCopied: 'Code copié dans le presse-papiers !',
      footer: '© 2024 GLSL Discord Bot. Fait avec ❤️ pour la communauté des shaders.',
    },
  },
} as const

export function getTranslations(locale: Locale) {
  return translations[locale]
}

