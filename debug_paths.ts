import ytdlp from '@distube/yt-dlp';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

console.log('ytdlp keys:', Object.keys(ytdlp || {}));
console.log('ytdlp default:', (ytdlp as any).default);
console.log('ytdlp path field:', (ytdlp as any).path);

console.log('ffmpeg keys:', Object.keys(ffmpeg || {}));
console.log('ffmpeg path field:', (ffmpeg as any).path);
