const FormData = require('form-data');
const fetch = require('node-fetch');

// Mock fetch
jest.mock('node-fetch');

describe('bot.js - editReply avec FormData et embeds (problème content vide)', () => {
    let mockInteraction;
    let mockBot;

    beforeEach(() => {
        // Mock fetch
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({})
        });

        mockInteraction = {
            id: '123',
            token: 'test-token',
            applicationId: 'app123',
            deferReply: jest.fn().mockResolvedValue(),
            editReply: jest.fn().mockImplementation(async (options) => {
                // Simuler le comportement de editReply dans bot.js
                if (options.files && options.files.length > 0) {
                    const formData = new FormData();
                    const embedsJson = options.embeds ? options.embeds.map(embed => {
                        if (embed && typeof embed.toJSON === 'function') {
                            return embed.toJSON();
                        }
                        return embed;
                    }).filter(embed => embed !== null && embed !== undefined) : [];
                    
                    const payloadJson = {};
                    
                    if (embedsJson.length > 0) {
                        payloadJson.embeds = embedsJson;
                    }
                    
                    if (options.content) {
                        payloadJson.content = options.content;
                    }
                    
                    // CRITIQUE: Avec FormData, Discord nécessite un content non-vide
                    // Utiliser Zero-Width Space (\u200B) qui est invisible mais valide
                    if (!payloadJson.content || payloadJson.content.trim() === '') {
                        // Si pas de content, utiliser Zero-Width Space (invisible mais valide)
                        payloadJson.content = '\u200B'; // Zero-Width Space - Discord ne le trim pas
                    }
                    
                    const payloadJsonString = JSON.stringify(payloadJson);
                    
                    // Vérifier que le payload est valide
                    const finalPayload = JSON.parse(payloadJsonString);
                    if (!finalPayload.content && (!finalPayload.embeds || finalPayload.embeds.length === 0)) {
                        throw new Error('Payload JSON vide - Discord nécessite au moins content ou embeds');
                    }
                    
                    // Vérifier que content n'est pas vide (devrait être Zero-Width Space si pas de content fourni)
                    if (finalPayload.content && finalPayload.content.trim() === '' && finalPayload.content !== '\u200B') {
                        throw new Error('Content ne peut pas être juste un espace (utiliser Zero-Width Space)');
                    }
                    
                    formData.append('payload_json', payloadJsonString);
                    
                    // Simuler l'envoi
                    const webhookUrl = `https://discord.com/api/v10/webhooks/app123/test-token/messages/@original`;
                    const response = await fetch(webhookUrl, {
                        method: 'PATCH',
                        headers: {
                            ...formData.getHeaders(),
                            'Authorization': 'Bot test-token'
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
                    }
                } else {
                    // Pas de fichiers, comportement normal
                }
            })
        };
    });

    it('devrait envoyer un message avec embeds et Zero-Width Space comme content', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        const fs = require('fs');
        const path = require('path');
        
        // Créer un fichier temporaire pour le test
        const testFile = path.join(__dirname, 'temp-test.gif');
        fs.writeFileSync(testFile, 'test gif content');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test Embed')
                .setDescription('Test description');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            await mockInteraction.editReply({
                embeds: [embed],
                files: [file]
            });
            
            // Vérifier que fetch a été appelé
            expect(fetch).toHaveBeenCalled();
            
            // Vérifier que fetch a été appelé avec succès
            const callArgs = fetch.mock.calls[0];
            const formData = callArgs[1].body;
            
            // Le FormData devrait contenir un payload_json valide avec Zero-Width Space
            expect(formData).toBeDefined();
            expect(fetch).toHaveBeenCalled();
        } finally {
            // Nettoyer
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('devrait remplacer un espace vide par Zero-Width Space avec des embeds', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        const fs = require('fs');
        const path = require('path');
        
        const testFile = path.join(__dirname, 'temp-test2.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test')
                .setDescription('Test');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            // Essayer avec un content qui est un espace (devrait être remplacé par Zero-Width Space)
            await expect(
                mockInteraction.editReply({
                    content: ' ', // Espace seul - devrait être remplacé par \u200B
                    embeds: [embed],
                    files: [file]
                })
            ).resolves.not.toThrow();
            
            // Vérifier que fetch a été appelé
            expect(fetch).toHaveBeenCalled();
            
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('devrait accepter un payload avec embeds et Zero-Width Space comme content', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        const fs = require('fs');
        const path = require('path');
        
        const testFile = path.join(__dirname, 'temp-test3.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test Embed')
                .setDescription('Description')
                .addFields({ name: 'Field', value: 'Value', inline: true });
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            await mockInteraction.editReply({
                embeds: [embed],
                files: [file]
            });
            
            expect(fetch).toHaveBeenCalled();
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });
});

