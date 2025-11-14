/**
 * ErrorHandler - Gestion centralisée des erreurs avec messages utilisateur
 */

const { EmbedBuilder } = require('discord.js');
const { Logger } = require('./logger');

class ErrorHandler {
    /**
     * Gère une erreur et répond à l'interaction Discord
     */
    static async handle(interaction, error, context = {}) {
        Logger.error('Command failed', error, context);

        const errorMessage = this.getErrorMessage(error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription(errorMessage)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            Logger.error('Failed to send error message', replyError);
        }
    }

    /**
     * Obtient un message d'erreur convivial pour l'utilisateur
     */
    static getErrorMessage(error) {
        const errorMsg = error.message || String(error);

        if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
            return '⏱️ Le shader a pris trop de temps à compiler. Essayez un shader plus simple ou réessayez plus tard.';
        }

        if (errorMsg.includes('syntax') || errorMsg.includes('Syntax')) {
            return '❌ Erreur de syntaxe dans votre shader. Vérifiez votre code GLSL/WGSL.';
        }

        if (errorMsg.includes('WebGL') || errorMsg.includes('webgl')) {
            return '❌ Erreur WebGL. Le shader ne peut pas être compilé. Vérifiez votre code.';
        }

        if (errorMsg.includes('memory') || errorMsg.includes('Memory')) {
            return '❌ Erreur de mémoire. Le shader est trop complexe. Simplifiez-le.';
        }

        if (errorMsg.includes('not found') || errorMsg.includes('not available')) {
            return '❌ Ressource non trouvée. Vérifiez que le shader ou la texture existe.';
        }

        if (errorMsg.includes('rate limit') || errorMsg.includes('Rate limit')) {
            return '⏱️ Vous avez atteint la limite de requêtes. Réessayez dans quelques instants.';
        }

        // Erreur générique
        return '❌ Une erreur est survenue lors de la compilation. Réessayez plus tard ou contactez le support si le problème persiste.';
    }

    /**
     * Enregistre une erreur sans répondre à l'interaction
     */
    static log(error, context = {}) {
        Logger.error('Error occurred', error, context);
    }
}

module.exports = { ErrorHandler };

