import 'dotenv/config';
import {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Interaction,
    TextBasedChannel,
    ChatInputCommandInteraction,
    ButtonInteraction,
    ActivityType,
    PresenceUpdateStatus,
    MessageFlags
} from 'discord.js';
import { MusicPlayer, Song } from './client/player.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { GeminiClient } from './client/gemini.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './client/database.js';

// Define Command Interface
interface Command {
    data: any;
    execute: (interaction: any, ...args: any[]) => Promise<void>;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
}) as Client & { commands: Collection<string, Command> };

client.commands = new Collection();
const player = new MusicPlayer();
const gemini = new GeminiClient(process.env.GEMINI_API_KEY!);

// Test DB Connection
db.testConnection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOOP_LABELS = {
    'none': '🔁 Loop Off',
    'track': '🔂 Loop 1',
    'queue': '🔁 Loop All'
};

const LOOP_STYLES = {
    'none': ButtonStyle.Secondary,
    'track': ButtonStyle.Primary,
    'queue': ButtonStyle.Primary
};

// Helper to create the Now Playing UI
function createNowPlayingUI(guildId: string, song: Song) {
    const data = player.getGuildData(guildId);
    const volumePercent = Math.round(data.volume * 100);

    const embed = new EmbedBuilder()
        .setColor('#FF007F') // Vibrant Pink
        .setTitle('🎶 Now Playing')
        .setDescription(`**${song.title}**`)
        .addFields(
            { name: '⏱️ Duration', value: `\`${song.duration || 'Unknown'}\``, inline: true },
            { name: '🔊 Volume', value: `\`${volumePercent}%\``, inline: true },
            { name: '✨ Status', value: '`Playing`', inline: true }
        )
        .setTimestamp();

    if (song.thumbnail && song.thumbnail.startsWith('http')) {
        embed.setThumbnail(song.thumbnail);
    }

    const isPaused = data.player.state.status === AudioPlayerStatus.Paused;
    const loopMode = data.loopMode || 'none';

    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('vol_up')
                .setLabel('➕')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('vol_down')
                .setLabel('➖')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('loop')
                .setLabel(LOOP_LABELS[loopMode])
                .setStyle(LOOP_STYLES[loopMode]),
            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('🛑 Stop')
                .setStyle(ButtonStyle.Danger),
        );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queue')
                .setLabel('📜 Queue')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(isPaused ? 'resume' : 'pause')
                .setLabel(isPaused ? '▶️ Resume' : '⏸️ Pause')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
        );

    return { embeds: [embed], components: [row1, row2] };
}

// Player Events
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

player.on('songStart', async (guildId: string, song: Song) => {
    // Batalkan timer auto-disconnect jika ada lagu baru
    if (disconnectTimers.has(guildId)) {
        clearTimeout(disconnectTimers.get(guildId)!);
        disconnectTimers.delete(guildId);
    }

    const data = player.getGuildData(guildId);
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channelId = data.textChannelId;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased() || !('send' in channel)) return;

    // Remove old message to keep channel clean
    if (data.nowPlayingMessage) {
        try {
            await data.nowPlayingMessage.delete();
        } catch (e) {
            // Message might have been deleted already
        }
    }

    const ui = createNowPlayingUI(guildId, song);
    const message = await (channel as any).send(ui);
    data.nowPlayingMessage = message;
});

player.on('queueEnd', async (guildId: string) => {
    const data = player.getGuildData(guildId);
    if (data.nowPlayingMessage) {
        try {
            await data.nowPlayingMessage.delete();
        } catch (e) { }
        data.nowPlayingMessage = null;
    }

    // Auto-disconnect setelah 1 menit tanpa aktivitas
    const timer = setTimeout(() => {
        const currentData = player.getGuildData(guildId);
        if (currentData.connection && !currentData.currentSong) {
            currentData.connection.destroy();
            currentData.connection = null;
        }
        disconnectTimers.delete(guildId);
    }, 60_000);
    disconnectTimers.set(guildId, timer);
});

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // Use dynamic import for ESM compatibility
    const { default: command } = await import(`file://${filePath}`);

    if (Array.isArray(command)) {
        for (const cmd of command) {
            client.commands.set(cmd.data.name, cmd);
        }
    } else {
        client.commands.set(command.data.name, command);
    }
}

client.once('clientReady', async (readyClient) => {
    console.log(`Bot logged in as ${readyClient.user.tag}! (TypeScript)`);
    await db.init();

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
    try {
        const commands = client.commands.map(cmd => cmd.data.toJSON());
        await rest.put(
            Routes.applicationCommands(client.user!.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    // Set Status and Rotating Activities
    const activities = [
        { name: 'Music on YouTube', type: ActivityType.Listening },
        { name: 'Video on Youtube', type: ActivityType.Playing },
        { name: '/help for commands', type: ActivityType.Watching },
    ];

    let i = 0;
    setInterval(() => {
        const activity = activities[i];
        readyClient.user.setPresence({
            activities: [activity],
            status: PresenceUpdateStatus.Idle,
        });
        i = (i + 1) % activities.length;
    }, 10000); // Change every 10 seconds

    // Memento Checker (Server Time Capsule)
    setInterval(async () => {
        try {
            const now = new Date();
            const unlockedMementos: any = await db.query(
                'SELECT * FROM mementos WHERE unlock_at <= ?',
                [now]
            );

            for (const memento of unlockedMementos) {
                const channel = await readyClient.channels.fetch(memento.channel_id);
                if (channel && 'send' in channel) {
                    await (channel as any).send(`🔔 **Time Capsule Unlocked!**\n<@${memento.user_id}>, here is the message you saved on <t:${Math.floor(new Date(memento.created_at).getTime() / 1000)}:f>:\n\n> ${memento.content}`);
                }

                // Delete once sent
                await db.query('DELETE FROM mementos WHERE id = ?', [memento.id]);
            }
        } catch (error) {
            console.error('❌ Error in memento checker:', error);
        }
    }, 60000); // Check every 1 minute
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isButton()) {
        const buttonInt = interaction as ButtonInteraction;
        const data = player.getGuildData(buttonInt.guildId!);

        if (buttonInt.customId === 'stop') {
            player.stop(buttonInt.guildId!);

            // Delete the Now Playing message
            if (data.nowPlayingMessage) {
                try {
                    await data.nowPlayingMessage.delete();
                } catch (e) { }
                data.nowPlayingMessage = null;
            }

            await buttonInt.reply({ content: `🛑 Music stopped and bot disconnected by ${buttonInt.user}.` });
            return;
        }

        if (!data || !data.currentSong) {
            return buttonInt.reply({ content: '❌ No music is currently playing.', flags: MessageFlags.Ephemeral as any });
        }

        if (buttonInt.customId === 'pause') {
            player.pause(buttonInt.guildId!);
            const ui = createNowPlayingUI(buttonInt.guildId!, data.currentSong);
            await buttonInt.update(ui);
            return;
        }

        if (buttonInt.customId === 'resume') {
            player.resume(buttonInt.guildId!);
            const ui = createNowPlayingUI(buttonInt.guildId!, data.currentSong);
            await buttonInt.update(ui);
            return;
        }

        if (buttonInt.customId === 'queue') {
            const queueList = player.getQueue(buttonInt.guildId!);
            let queueString = '';
            if (data.currentSong) {
                queueString += `👉 **${data.currentSong.title}** (\`${data.currentSong.duration}\`) - *Playing*\n\n`;
            }

            if (queueList.length === 0 && !data.currentSong) {
                return buttonInt.reply({ content: '📜 The queue is currently empty.', flags: MessageFlags.Ephemeral as any });
            }

            queueString += queueList.map((s, index) => `${index + 1}. **${s.title}** (\`${s.duration}\`)`).join('\n');
            const queueEmbed = new EmbedBuilder()
                .setColor('#FF007F')
                .setTitle('📜 Upcoming Queue')
                .setDescription(queueString.length > 2000 ? queueString.substring(0, 1997) + '...' : queueString || 'No upcoming songs.');

            return buttonInt.reply({ embeds: [queueEmbed], flags: MessageFlags.Ephemeral as any });
        }

        if (buttonInt.customId === 'loop') {
            player.toggleLoop(buttonInt.guildId!);
            const ui = createNowPlayingUI(buttonInt.guildId!, data.currentSong);
            await buttonInt.update(ui);
            return;
        }

        if (buttonInt.customId === 'skip') {
            player.skip(buttonInt.guildId!);
            await buttonInt.reply({ content: '⏭️ Skipped to the next song.', flags: MessageFlags.Ephemeral as any });
            return;
        }

        let newVolume = data.volume;
        if (buttonInt.customId === 'vol_up') {
            newVolume = Math.min(newVolume + 0.1, 1.5);
        } else if (buttonInt.customId === 'vol_down') {
            newVolume = Math.max(newVolume - 0.1, 0.0);
        }

        player.setVolume(buttonInt.guildId!, newVolume);

        const ui = createNowPlayingUI(buttonInt.guildId!, data.currentSong);
        await buttonInt.update(ui);
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const commandInt = interaction as ChatInputCommandInteraction;

    const command = client.commands.get(commandInt.commandName);
    if (!command) return;

    try {
        await command.execute(commandInt, player, gemini);
    } catch (error) {
        console.error(error);
        const reply = { content: '❌ An error occurred while executing this command.', flags: MessageFlags.Ephemeral as any };

        try {
            if (commandInt.deferred || commandInt.replied) {
                await commandInt.followUp(reply);
            } else {
                await commandInt.reply(reply);
            }
        } catch (e) {
            console.error('Failed to send error reply:', e);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
