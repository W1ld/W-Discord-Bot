import { SlashCommandBuilder, ChatInputCommandInteraction, VoiceBasedChannel, GuildMember, MessageFlags } from 'discord.js';
import { MusicPlayer } from '../client/player.js';

const skip = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the currently playing song'),
    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        player.skip(interaction.guildId!);
        await interaction.reply('⏭️ Song skipped.');
    }
};

const stop = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        player.stop(interaction.guildId!);
        await interaction.reply('🛑 Stopped and queue cleared.');
    }
};

const queue = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current song queue'),
    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        const data = player.queue.get(interaction.guildId!);
        if (!data || data.songs.length === 0) {
            await interaction.reply('📭 Queue is empty.');
            return;
        }

        let content = '**🎶 Current Queue:**\n';
        data.songs.forEach((song, i) => {
            if (i >= 10) return;
            content += `${i + 1}. ${song.title}\n`;
        });
        if (data.songs.length > 10) {
            content += `... and ${data.songs.length - 10} more songs.`;
        }
        await interaction.reply(content);
    }
};

const join = {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Make the bot join your voice channel'),
    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        const member = interaction.member as GuildMember;
        const channel = member?.voice?.channel as VoiceBasedChannel;
        if (!channel) {
            await interaction.reply({ content: '❌ You must be in a voice channel first!', flags: MessageFlags.Ephemeral as any });
            return;
        }
        
        try {
            await player.join(channel);
            await interaction.reply('🎙️ Successfully joined!');
        } catch (error) {
            console.error(error);
            await interaction.reply('❌ Failed to join the voice channel.');
        }
    }
};

const leave = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave the voice channel'),
    async execute(interaction: ChatInputCommandInteraction, player: MusicPlayer): Promise<void> {
        player.stop(interaction.guildId!);
        await interaction.reply('👋 Goodbye!');
    }
};

export default [skip, stop, queue, join, leave];
