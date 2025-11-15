# 📎 Historique des Tentatives d'Upload de Fichiers Discord

Ce document décrit toutes les tentatives et stratégies pour envoyer des GIFs animés à Discord via webhooks.

## ✅ Solution Finale (PRIORITÉ 1)

### Stratégie: `rest.patch_explicit_buffers_with_embed`

**Méthode**: Utiliser un embed avec `image.url: "attachment://filename.gif"` et lire explicitement les fichiers en Buffer.

**Pourquoi ça fonctionne**:
- Discord affiche les GIFs animés **SEULEMENT** si on utilise un embed avec `image.url: "attachment://filename.gif"`
- Lire les fichiers en Buffer évite les problèmes de discord.js avec les chemins de fichiers
- Déclarer les attachments dans le payload permet à Discord de faire le lien entre l'embed et le fichier

**Code**:
```javascript
const embed = {
    image: {
        url: `attachment://${fileName}`
    }
};

const attachments = filesWithBuffers.map((file, index) => ({
    id: index,
    filename: file.name,
    description: 'Shader animation'
}));

const payload = {
    embeds: [embed],
    attachments: attachments
};

await rest.patch(Routes.webhookMessage(applicationId, interactionToken, '@original'), {
    body: payload,
    files: filesWithBuffers // Buffers lus avec fs.readFileSync()
});
```

## ❌ Tentatives Échouées

### Tentative 1: Envoi sans embed
- **Problème**: Discord affiche juste une icône de fichier, pas le GIF animé
- **Résultat**: GIF non visible, seulement fichier attaché

### Tentative 2: Double édition
- **Problème**: Bug Discord connu, ne fonctionne pas de manière fiable
- **Résultat**: GIF parfois visible, parfois non

### Tentative 3: FormData direct avec fetch
- **Problème**: Discord reçoit seulement 9 bytes (métadonnées)
- **Résultat**: Fichier corrompu

### Tentative 4: AttachmentBuilder sans embed
- **Problème**: Discord ne traite pas correctement les AttachmentBuilder pour webhooks
- **Résultat**: Fichier non envoyé correctement

## 📝 Notes Importantes

1. **Embed requis**: Discord nécessite un embed avec `image.url: "attachment://filename"` pour afficher les GIFs animés
2. **Buffer explicite**: Lire les fichiers avec `fs.readFileSync()` avant d'envoyer
3. **Attachments déclarés**: Déclarer les attachments dans le payload pour que Discord fasse le lien
4. **Nom de fichier**: Le nom dans `image.url` doit correspondre exactement au nom du fichier attaché

