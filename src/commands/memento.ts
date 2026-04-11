import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { db } from '../client/database.js';

export default {
    data: new SlashCommandBuilder()
        .setName('memento')
        .setDescription('Save a message to be sent back to you in the future (Time Capsule)')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message you want to save')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('when')
                .setDescription("When to remind? (e.g., 1m 2h 1d or YYYY-MM-DD HH:mm)")
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const message = interaction.options.getString('message', true);
        const whenStr = interaction.options.getString('when', true);

        let unlockAt: Date;

        const isDurationOnly = /^(\s*\d+\s*[mhd]\s*)+$/i.test(whenStr);
        if (isDurationOnly) {
            let msOffset = 0;
            const matches = [...whenStr.matchAll(/(\d+)\s*([mhd])/gi)];
            for (const match of matches) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                if (unit === 'm') msOffset += value * 60 * 1000;
                else if (unit === 'h') msOffset += value * 60 * 60 * 1000;
                else if (unit === 'd') msOffset += value * 24 * 60 * 60 * 1000;
            }
            unlockAt = new Date(Date.now() + msOffset);
        } else {
            const timestamp = Date.parse(whenStr);
            if (isNaN(timestamp)) {
                await interaction.reply({
                    content: '❌ Invalid time format. Use relative (e.g. `1m`, `2h`, `1d`) or exact date (e.g. `YYYY-MM-DD HH:mm`).',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            unlockAt = new Date(timestamp);
            if (unlockAt.getTime() <= Date.now()) {
                await interaction.reply({
                    content: '❌ The deadline must be in the future.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
        }

        try {
            await db.query(
                'INSERT INTO mementos (user_id, guild_id, channel_id, content, unlock_at) VALUES (?, ?, ?, ?, ?)',
                [interaction.user.id, interaction.guildId, interaction.channelId, message, unlockAt]
            );

            await interaction.reply({
                content: `✅ Memento saved! I will remind you of this on <t:${Math.floor(unlockAt.getTime() / 1000)}:F>.`,
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('❌ Error saving memento:', error);
            await interaction.reply({
                content: '❌ Failed to save memento to the database.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
