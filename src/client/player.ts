import {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    joinVoiceChannel,
    entersState,
    AudioPlayer,
    VoiceConnection,
    AudioResource
} from '@discordjs/voice';
import { StreamType } from '@discordjs/voice';
import type { VoiceBasedChannel } from 'discord.js';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { Message } from 'discord.js';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find the yt-dlp binary path
const getYtDlpPath = () => {
    const isWindows = process.platform === 'win32';
    const fileName = `yt-dlp${isWindows ? '.exe' : ''}`;
    // Path: src/client/player.ts -> src/client -> src -> project_root -> node_modules
    return path.join(__dirname, '..', '..', 'node_modules', '@distube', 'yt-dlp', 'bin', fileName);
};

const ytdlpBinary = getYtDlpPath();

export interface Song {
    title: string;
    url: string;
    duration: string;
    thumbnail?: string;
}

export interface GuildQueue {
    songs: Song[];
    player: AudioPlayer;
    connection: VoiceConnection | null;
    currentSong: Song | null;
    currentResource: AudioResource | null;
    currentProcesses: {
        ytdlp: any;
        ffmpeg: any;
    } | null;
    volume: number;
    nowPlayingMessage: Message | null;
    textChannelId: string | null;
    loopMode: 'none' | 'track' | 'queue';
    forceSkip: boolean;
}

export class MusicPlayer extends EventEmitter {
    public queue: Map<string, GuildQueue>;

    constructor() {
        super();
        this.queue = new Map();
    }

    public getGuildData(guildId: string): GuildQueue {
        if (!this.queue.has(guildId)) {
            const player = createAudioPlayer();

            player.on('error', error => {
                console.error(`Error: ${error.message}`);
            });

            player.on(AudioPlayerStatus.Idle, () => {
                this.playNext(guildId);
            });

            this.queue.set(guildId, {
                songs: [],
                player: player,
                connection: null,
                currentSong: null,
                currentResource: null,
                currentProcesses: null,
                volume: 0.5,
                nowPlayingMessage: null,
                textChannelId: null,
                loopMode: 'none',
                forceSkip: false
            });
        }
        return this.queue.get(guildId)!;
    }

    public addToQueue(guildId: string, song: Song): void {
        const data = this.getGuildData(guildId);
        data.songs.push(song);
        if (data.player.state.status === AudioPlayerStatus.Idle) {
            this.playNext(guildId);
        }
    }

    public async playNext(guildId: string): Promise<void> {
        const data = this.queue.get(guildId);
        if (!data) return;

        const previousSong = data.currentSong;
        if (previousSong) {
            if (data.forceSkip) {
                // If skipped, we only re-add to queue if looping queue
                if (data.loopMode === 'queue') {
                    data.songs.push(previousSong);
                }
                data.forceSkip = false;
            } else {
                if (data.loopMode === 'track') {
                    data.songs.unshift(previousSong);
                } else if (data.loopMode === 'queue') {
                    data.songs.push(previousSong);
                }
            }
        }

        if (data.songs.length === 0) {
            this.cleanupProcesses(guildId);
            data.currentSong = null;
            data.currentResource = null;
            this.emit('queueEnd', guildId);
            return;
        }

        this.cleanupProcesses(guildId);

        const song = data.songs.shift()!;
        data.currentSong = song;

        try {
            const { resource, ytdlp, ffmpeg } = this.createResource(song.url, data.volume);
            data.currentResource = resource;
            data.currentProcesses = { ytdlp, ffmpeg };
            data.player.play(resource);

            this.emit('songStart', guildId, song);
        } catch (error) {
            console.error("Error playing next song:", error);
            this.playNext(guildId);
        }
    }

    private cleanupProcesses(guildId: string) {
        const data = this.queue.get(guildId);
        if (data && data.currentProcesses) {
            try {
                data.currentProcesses.ytdlp.kill('SIGKILL');
                data.currentProcesses.ffmpeg.kill('SIGKILL');
            } catch (e) { }
            data.currentProcesses = null;
        }
    }

    private createResource(url: string, volume: number): { resource: AudioResource, ytdlp: any, ffmpeg: any } {
        const ytdlp = spawn(ytdlpBinary, [
            '-f', 'bestaudio/best',
            '--no-playlist',
            '--quiet', // Hanya hilangkan info command, tapi error jalan
            '-o', '-',
            url
        ]);

        const ffmpeg = spawn('ffmpeg', [
            '-i', 'pipe:0',
            '-vn',
            '-f', 's16le',
            '-ar', '48000',
            '-ac', '2',
            '-loglevel', 'error', // FFMPEG akan lapor jika ada error sistem
            'pipe:1'
        ]);

        ytdlp.stdout.pipe(ffmpeg.stdin);

        const resource = createAudioResource(ffmpeg.stdout, {
            inputType: StreamType.Raw,
            inlineVolume: true
        });

        resource.volume?.setVolume(volume);

        // Membuka kembali Pipa Error (Ini sangat penting untuk debugging bot-hosting)
        ytdlp.stderr.on('data', err => console.error(`[YT-DLP] ${err.toString().trim()}`));
        ffmpeg.stderr.on('data', err => console.error(`[FFMPEG] ${err.toString().trim()}`));

        ytdlp.on('error', err => console.error('[YT-DLP CRASH]:', err));
        ffmpeg.on('error', err => console.error('[FFMPEG CRASH]:', err));

        ytdlp.on('close', code => {
            if (code !== 0 && code !== null) console.log(`[YT-DLP] Keluar dengan kode: ${code}`);
        });

        return { resource, ytdlp, ffmpeg };
    }


    public setVolume(guildId: string, volume: number): boolean {
        const data = this.queue.get(guildId);
        if (data && data.currentResource && data.currentResource.volume) {
            data.volume = volume;
            data.currentResource.volume.setVolume(volume);
            return true;
        }
        return false;
    }

    public async join(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            const data = this.getGuildData(channel.guild.id);
            data.connection = connection;
            connection.subscribe(data.player);
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }

    public getQueue(guildId: string): Song[] {
        const data = this.queue.get(guildId);
        return data ? data.songs : [];
    }

    public skip(guildId: string): void {
        const data = this.queue.get(guildId);
        if (data && data.player) {
            data.forceSkip = true;
            data.player.stop();
            this.cleanupProcesses(guildId);
        }
    }

    public toggleLoop(guildId: string): 'none' | 'track' | 'queue' {
        const data = this.queue.get(guildId);
        if (!data) return 'none';

        if (data.loopMode === 'none') {
            data.loopMode = 'track';
        } else if (data.loopMode === 'track') {
            data.loopMode = 'queue';
        } else {
            data.loopMode = 'none';
        }
        return data.loopMode;
    }

    public pause(guildId: string): boolean {
        const data = this.queue.get(guildId);
        if (data && data.player.state.status !== AudioPlayerStatus.Paused) {
            return data.player.pause();
        }
        return false;
    }

    public resume(guildId: string): boolean {
        const data = this.queue.get(guildId);
        if (data && data.player.state.status === AudioPlayerStatus.Paused) {
            return data.player.unpause();
        }
        return false;
    }

    public stop(guildId: string): void {
        const data = this.queue.get(guildId);
        if (data) {
            data.songs = [];
            data.player.stop();
            this.cleanupProcesses(guildId);
            if (data.connection) {
                data.connection.destroy();
                data.connection = null;
            }
        }
    }
}

export async function fetchMetadata(url: string): Promise<Song[]> {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn(ytdlpBinary, [
            '--flat-playlist',
            '--no-warnings',
            '--ignore-errors',
            '-j',
            url
        ]);

        let output = '';
        ytdlp.stdout.on('data', (data: Buffer) => output += data.toString());
        ytdlp.on('close', (code: number) => {
            if (code !== 0) return reject(new Error('Failed to fetch YouTube metadata'));

            const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let songs = lines.map(line => {
                try {
                    const data = JSON.parse(line);
                    const id = data.id || '';
                    const finalUrl = (id && id !== 'NA') ? `https://www.youtube.com/watch?v=${id}` : '';
                    return {
                        title: data.title || 'Unknown Title',
                        url: finalUrl,
                        duration: data.duration_string || 'Unknown',
                        thumbnail: (data.thumbnail && data.thumbnail !== 'NA') ? data.thumbnail : ''
                    };
                } catch (e) {
                    return null;
                }
            }).filter(s => s && s.url) as Song[];

            // Fallback for single video if parsing failed but yt-dlp succeeded
            if (songs.length === 0 && !url.includes('list=')) {
                songs = [{ title: 'YouTube Video', url: url, duration: 'Unknown', thumbnail: '' }];
            }

            resolve(songs);
        });
    });
}
