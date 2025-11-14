/**
 * CustomEmbedBuilder - Création d'embeds Discord cohérents et professionnels
 */

const { EmbedBuilder } = require('discord.js');

class CustomEmbedBuilder {
    static COLORS = {
        SUCCESS: '#00FF00',
        ERROR: '#FF0000',
        INFO: '#3498DB',
        WARNING: '#FFA500',
        SHADER: '#9B59B6',
        PROGRESS: '#FFA500'
    };

    /**
     * Crée un embed de succès
     */
    static success(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.COLORS.SUCCESS)
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    /**
     * Crée un embed d'erreur
     */
    static error(title, description) {
        return new EmbedBuilder()
            .setColor(this.COLORS.ERROR)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();
    }

    /**
     * Crée un embed d'information
     */
    static info(title, description, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(this.COLORS.INFO)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    /**
     * Crée un embed d'avertissement
     */
    static warning(title, description) {
        return new EmbedBuilder()
            .setColor(this.COLORS.WARNING)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();
    }

    /**
     * Crée un embed pour un shader compilé
     */
    static shaderCompiled(shaderData) {
        const embed = new EmbedBuilder()
            .setColor(this.COLORS.SHADER)
            .setTitle('🎨 Shader Compilé!')
            .setDescription(`Shader compilé par **${shaderData.username}**`)
            .setFooter({ text: `Utilisez /reuse ${shaderData.id} pour réutiliser ce shader` })
            .setTimestamp();

        if (shaderData.id) {
            embed.addFields({ name: '🆔 ID', value: `\`${shaderData.id}\``, inline: true });
        }

        if (shaderData.duration !== undefined) {
            embed.addFields({ name: '⏱️ Durée', value: `${shaderData.duration}s`, inline: true });
        }

        if (shaderData.frames !== undefined) {
            embed.addFields({ name: '📊 Frames', value: `${shaderData.frames}`, inline: true });
        }

        if (shaderData.resolution) {
            embed.addFields({ name: '📐 Résolution', value: shaderData.resolution, inline: true });
        }

        if (shaderData.presetName) {
            embed.addFields({ name: '🎨 Preset', value: `\`${shaderData.presetName}\``, inline: true });
        }

        if (shaderData.cached) {
            embed.addFields({ name: '⚡ Cache', value: 'Utilisé', inline: true });
        }

        if (shaderData.gifUrl) {
            embed.setImage(shaderData.gifUrl);
        }

        return embed;
    }

    /**
     * Crée un embed de progression
     */
    static progress(step, percent) {
        const progressBar = this.createProgressBar(percent);
        return new EmbedBuilder()
            .setColor(this.COLORS.PROGRESS)
            .setTitle('⚙️ Compilation en cours...')
            .setDescription(`${step}\n${progressBar}`)
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();
    }

    /**
     * Crée une barre de progression visuelle
     */
    static createProgressBar(percent) {
        const filled = Math.floor(percent / 5);
        const empty = 20 - filled;
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percent}%`;
    }

    /**
     * Crée un embed de statistiques
     */
    static stats(statsData) {
        const embed = new EmbedBuilder()
            .setColor(this.COLORS.INFO)
            .setTitle('📊 Statistiques du Bot')
            .setFooter({ text: 'GLSL Discord Bot' })
            .setTimestamp();

        if (statsData.totalShaders !== undefined) {
            embed.addFields({ name: '🎨 Shaders Totaux', value: `${statsData.totalShaders}`, inline: true });
        }

        if (statsData.uniqueUsers !== undefined) {
            embed.addFields({ name: '👥 Utilisateurs Uniques', value: `${statsData.uniqueUsers}`, inline: true });
        }

        if (statsData.successRate !== undefined) {
            embed.addFields({ name: '✅ Taux de Succès', value: `${statsData.successRate}%`, inline: true });
        }

        if (statsData.avgCompilationTime !== undefined) {
            embed.addFields({ name: '⏱️ Temps Moyen', value: `${statsData.avgCompilationTime}ms`, inline: true });
        }

        return embed;
    }
}

module.exports = { CustomEmbedBuilder };

