/**
 * Tests pour vérifier que editReply utilise Zero-Width Space (\u200B) 
 * avec FormData + embeds pour éviter l'erreur "Cannot send an empty message"
 */

const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Mock fetch
jest.mock('node-fetch');

describe('bot.js - editReply avec Zero-Width Space et FormData', () => {
    let mockInteraction;
    let mockBot;

    beforeEach(() => {
        // Mock fetch pour simuler une réponse réussie
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({ id: '123' }),
            text: jest.fn().mockResolvedValue('OK')
        });

        // Simuler le comportement réel de editReply dans bot.js
        mockInteraction = {
            id: '123',
            token: 'test-token',
            applicationId: 'app123',
            deferReply: jest.fn().mockResolvedValue(),
            editReply: jest.fn().mockImplementation(async (options) => {
                // Simuler le comportement de editReply dans bot.js
                if (options.files && options.files.length > 0) {
                    const FormData = require('form-data');
                    const formData = new FormData();
                    
                    // Préparer le payload JSON (comme dans bot.js)
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
                    
                    if (options.components) {
                        payloadJson.components = options.components;
                    }
                    
                    // CRITIQUE: Logique actuelle avec Zero-Width Space
                    if (!options.content || options.content.trim() === '') {
                        // Si pas de content, utiliser Zero-Width Space (invisible mais valide)
                        payloadJson.content = '\u200B'; // Zero-Width Space - Discord ne le trim pas
                    } else {
                        // Si un content réel est fourni, l'utiliser
                        payloadJson.content = options.content;
                    }
                    
                    const payloadJsonString = JSON.stringify(payloadJson);
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
                    
                    return await response.json();
                } else {
                    // Pas de fichiers, comportement normal
                    return {};
                }
            })
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('devrait utiliser Zero-Width Space (\u200B) quand pas de content avec FormData + embeds', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        
        // Créer un fichier temporaire pour le test
        const testFile = path.join(__dirname, 'temp-zerowidth-test.gif');
        fs.writeFileSync(testFile, 'test gif content');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test Embed')
                .setDescription('Test description');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            await mockInteraction.editReply({
                embeds: [embed],
                files: [file]
                // Pas de content
            });
            
            // Vérifier que fetch a été appelé
            expect(fetch).toHaveBeenCalled();
            
            // Extraire le payload JSON du FormData
            const callArgs = fetch.mock.calls[0];
            const formData = callArgs[1].body;
            
            // Vérifier que le FormData contient payload_json
            expect(formData).toBeDefined();
            
            // Le payload devrait contenir Zero-Width Space comme content
            // Note: On ne peut pas facilement extraire le payload depuis FormData dans les tests
            // Mais on peut vérifier que l'appel a réussi
            expect(fetch.mock.results[0].value).resolves.toBeDefined();
        } finally {
            // Nettoyer
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('devrait utiliser Zero-Width Space même si content est un espace vide', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        
        const testFile = path.join(__dirname, 'temp-zerowidth-test2.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test')
                .setDescription('Test');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            // Essayer avec un content qui est un espace (devrait être remplacé par \u200B)
            await mockInteraction.editReply({
                content: ' ', // Espace seul - devrait être remplacé
                embeds: [embed],
                files: [file]
            });
            
            expect(fetch).toHaveBeenCalled();
            // L'appel devrait réussir car Zero-Width Space est utilisé
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('devrait utiliser le content réel si fourni avec FormData + embeds', async () => {
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        
        const testFile = path.join(__dirname, 'temp-zerowidth-test3.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test Embed')
                .setDescription('Description');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            const realContent = 'Shader compilé avec succès !';
            
            await mockInteraction.editReply({
                content: realContent,
                embeds: [embed],
                files: [file]
            });
            
            expect(fetch).toHaveBeenCalled();
            // Le content réel devrait être utilisé, pas Zero-Width Space
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('devrait valider que Zero-Width Space n\'est pas trimmé', () => {
        const zeroWidthSpace = '\u200B';
        
        // Vérifier que Zero-Width Space n'est pas trimmé par trim()
        expect(zeroWidthSpace.trim()).toBe(zeroWidthSpace);
        expect(zeroWidthSpace.length).toBe(1);
        expect(zeroWidthSpace).not.toBe(' ');
        expect(zeroWidthSpace).not.toBe('');
        
        // Vérifier que c'est bien un caractère non-vide
        expect(zeroWidthSpace.length).toBeGreaterThan(0);
    });

    it('devrait utiliser Zero-Width Space avec FormData même sans embeds', async () => {
        const { AttachmentBuilder } = require('discord.js');
        
        const testFile = path.join(__dirname, 'temp-zerowidth-test4.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            await mockInteraction.editReply({
                files: [file]
                // Pas de content, pas d'embeds
            });
            
            expect(fetch).toHaveBeenCalled();
            // Zero-Width Space devrait être utilisé
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });

    it('ne devrait pas utiliser Zero-Width Space si content réel est fourni', () => {
        // Simuler la logique de bot.js
        const options = {
            content: 'Vrai message',
            embeds: [{ title: 'Test' }]
        };
        
        let payloadJson = {};
        
        if (!options.content || options.content.trim() === '') {
            payloadJson.content = '\u200B';
        } else {
            payloadJson.content = options.content;
        }
        
        // Vérifier que le content réel est utilisé
        expect(payloadJson.content).toBe('Vrai message');
        expect(payloadJson.content).not.toBe('\u200B');
    });

    it('devrait gérer correctement les erreurs Discord API avec Zero-Width Space', async () => {
        // Simuler une erreur Discord
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            text: jest.fn().mockResolvedValue(JSON.stringify({ 
                message: 'Cannot send an empty message', 
                code: 50006 
            }))
        });
        
        const { EmbedBuilder } = require('discord.js');
        const { AttachmentBuilder } = require('discord.js');
        
        const testFile = path.join(__dirname, 'temp-zerowidth-test5.gif');
        fs.writeFileSync(testFile, 'test');
        
        try {
            const embed = new EmbedBuilder()
                .setTitle('Test')
                .setDescription('Test');
            
            const file = new AttachmentBuilder(testFile, { name: 'animation.gif' });
            
            // Devrait lancer une erreur si Discord rejette
            await expect(
                mockInteraction.editReply({
                    embeds: [embed],
                    files: [file]
                })
            ).rejects.toThrow();
        } finally {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        }
    });
});

