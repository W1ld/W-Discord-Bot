import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { GeminiClient } from '../client/gemini.js';
import { MusicPlayer } from '../client/player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Talk to Gemini AI')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Your message for the AI')
                .setRequired(true)),
    
    async execute(interaction: ChatInputCommandInteraction, _player: MusicPlayer, gemini: GeminiClient): Promise<void> {
        const message = interaction.options.getString('message', true);
        
        await interaction.deferReply();

        try {
            const response = await gemini.generateResponse(message);
            
            if (response.length > 2000) {
                const chunks = response.match(/[\s\S]{1,2000}/g);
                if (chunks) {
                    await interaction.editReply(chunks[0]);
                    for (let i = 1; i < chunks.length; i++) {
                        await interaction.followUp(chunks[i]);
                    }
                }
            } else {
                await interaction.editReply(response);
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Failed to connect to Gemini AI.');
        }
    }
};
