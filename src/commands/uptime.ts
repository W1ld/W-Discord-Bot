import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Check how long the bot has been running'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const totalUptime = interaction.client.uptime || 0;

        let totalSeconds = (totalUptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        const uptimeString = [];
        if (days > 0) uptimeString.push(`**${days}** days`);
        if (hours > 0) uptimeString.push(`**${hours}** hours`);
        if (minutes > 0) uptimeString.push(`**${minutes}** minutes`);
        uptimeString.push(`**${seconds}** seconds`);

        const botName = process.env.BOT_NAME || 'Bot';
        const embed = new EmbedBuilder()
            .setColor('#00ff99c9')
            .setTitle(`⏱️ ${botName} Uptime`)
            .setDescription(`**${botName}** has been running for:\n${uptimeString.join(', ')}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
