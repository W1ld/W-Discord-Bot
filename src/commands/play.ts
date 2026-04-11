import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, MessageFlags } from 'discord.js';
import { MusicPlayer, fetchMetadata } from '../client/player.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play audio from YouTube (Video or Playlist)')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('YouTube Link (Video/Playlist) or A title of the song')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        let input = interaction.options.getString('input', true).trim();

        // Smart Search: Check if it's a direct link or needs a search prefix
        const isDirectLink = input.startsWith('http') || input.includes('youtube.com/') || input.includes('youtu.be/');

        if (!isDirectLink) {
            input = `ytsearch1:${input}`;
        }

        const member = interaction.member as GuildMember;
        const voiceChannel = member?.voice?.channel;
        if (!voiceChannel) {
            await interaction.reply({ content: '❌ You must be in a voice channel first!', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        try {
            const songs = await fetchMetadata(input);

            if (songs.length === 0) {
                await interaction.editReply({ content: '❌ No video found at that link.' });
                return;
            }

            // voiceChannel is already checked before deferring
            await player.join(voiceChannel!);

            const data = player.getGuildData(interaction.guildId!);
            data.textChannelId = interaction.channelId;

            for (const song of songs) {
                player.addToQueue(interaction.guildId!, song);
            }

            const msg = songs.length > 1
                ? `✅ Added **${songs.length}** songs from the playlist to the queue.`
                : `✅ Added **${songs[0].title}** to the queue.`;

            await interaction.editReply(msg);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ An error occurred while processing the YouTube link.' });
        }
    }
};
