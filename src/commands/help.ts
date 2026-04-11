import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show a list of all available commands'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const botName = process.env.BOT_NAME || 'Bot';
        const embed = new EmbedBuilder()
            .setColor('#00ff99')
            .setTitle(`🤖 ${botName} Help (TypeScript)`)
            .setDescription('Here is a list of available commands:')
            .addFields(
                {
                    name: '🎵 Music', value:
                        '**/play [url]** - Play YouTube video/playlist\n' +
                        '**/skip** - Skip the current song\n' +
                        '**/queue** - View the song queue\n' +
                        '**/stop** - Stop & clear the queue\n' +
                        '**/join** - Join a voice channel\n' +
                        '**/leave** - Leave the voice channel'
                },
                {
                    name: '🤖 AI & Others', value:
                        `**/chat [message]** - Talk to ${botName}\n` +
                        '**/memento [message] [when]** - Save a time capsule (e.g. 1m, 1h 1d or YYYY-MM-DD HH:mm)\n' +
                        '**/uptime** - Check how long the bot has been running\n' +
                        '**/help** - Show this help message'
                }
            )
            .setFooter({ text: 'Use the buttons under the "Now Playing" message for volume control!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
