import {
  type Guild,
  type VoiceBasedChannel,
  type User,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  type VoiceConnection,
  type AudioPlayer,
} from '@discordjs/voice';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { YouTube } from 'youtube-sr';
import { logger } from '../../logger.js';

const execFileAsync = promisify(execFile);

export interface Track {
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
  requestedBy: User;
}

const YTDLP_BASE_ARGS = [
  '--extractor-args', 'youtube:player_client=ios,mweb',
  '--no-playlist',
];

/** Get direct audio stream URL via yt-dlp */
async function getStreamUrl(videoUrl: string): Promise<string> {
  const { stdout } = await execFileAsync('yt-dlp', [
    ...YTDLP_BASE_ARGS,
    '-f', 'bestaudio[ext=webm]/bestaudio/best',
    '-g',
    videoUrl,
  ]);
  return stdout.trim().split('\n')[0];
}

/** Get video metadata via yt-dlp */
async function getVideoInfo(videoUrl: string): Promise<{ title: string; duration: string; thumbnail: string }> {
  const { stdout } = await execFileAsync('yt-dlp', [
    ...YTDLP_BASE_ARGS,
    '--dump-json',
    videoUrl,
  ]);
  const info = JSON.parse(stdout) as { title?: string; duration_string?: string; thumbnail?: string };
  return {
    title: info.title ?? 'Unknown',
    duration: info.duration_string ?? '0:00',
    thumbnail: info.thumbnail ?? '',
  };
}

export class MusicQueue {
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  public loop: 'none' | 'track' | 'queue' = 'none';
  public volume = 100;
  private player: AudioPlayer;
  private connection: VoiceConnection;
  private resource: ReturnType<typeof createAudioResource> | null = null;

  constructor(connection: VoiceConnection) {
    this.connection = connection;
    this.player = createAudioPlayer();
    connection.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.loop === 'track' && this.currentTrack) {
        this.playTrack(this.currentTrack);
        return;
      }
      if (this.loop === 'queue' && this.currentTrack) {
        this.tracks.push(this.currentTrack);
      }
      const next = this.tracks.shift();
      if (next) this.playTrack(next);
      else this.currentTrack = null;
    });

    this.player.on('error', (err) => {
      logger.error({ err }, 'Music player error');
      const next = this.tracks.shift();
      if (next) this.playTrack(next);
      else this.currentTrack = null;
    });
  }

  async playTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    try {
      const directUrl = await getStreamUrl(track.url);

      const ffmpeg = spawn('ffmpeg', [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', directUrl,
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'ignore'] });

      ffmpeg.on('error', (err) => logger.error({ err }, 'ffmpeg error'));

      this.resource = createAudioResource(ffmpeg.stdout!, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });
      this.resource.volume?.setVolume(this.volume / 100);
      this.player.play(this.resource);
    } catch (err) {
      logger.error({ err }, 'Failed to create audio resource');
      const next = this.tracks.shift();
      if (next) this.playTrack(next);
      else this.currentTrack = null;
    }
  }

  skip(): void { this.player.stop(); }
  pause(): boolean { return this.player.pause(); }
  resume(): boolean { return this.player.unpause(); }

  setVolume(vol: number): void {
    this.volume = vol;
    this.resource?.volume?.setVolume(vol / 100);
  }

  destroy(): void {
    this.player.stop();
    this.connection.destroy();
  }
}

export class MusicManager {
  private static queues = new Map<string, MusicQueue>();

  static getQueue(guildId: string): MusicQueue | undefined {
    return this.queues.get(guildId);
  }

  static deleteQueue(guildId: string): void {
    this.queues.delete(guildId);
  }

  static async play(
    guild: Guild,
    voiceChannel: VoiceBasedChannel,
    query: string,
    requestedBy: User
  ): Promise<{ type: 'playing' | 'added'; title: string; position?: number; duration?: string; thumbnail?: string }> {
    let trackInfo: { title: string; url: string; duration?: string; thumbnail?: string };

    try {
      const isYouTubeUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);

      if (isYouTubeUrl) {
        const info = await getVideoInfo(query);
        trackInfo = { ...info, url: query };
      } else {
        const results = await YouTube.search(query, { limit: 1, type: 'video' });
        const video = results[0];
        if (!video) throw new Error('No results found');
        trackInfo = {
          title: video.title ?? 'Unknown',
          url: video.url,
          duration: video.durationFormatted,
          thumbnail: video.thumbnail?.url,
        };
      }
    } catch (err) {
      logger.error({ err }, 'Music search/info failed');
      throw new Error('Could not find that track.');
    }

    const track: Track = { ...trackInfo, requestedBy };
    let queue = this.queues.get(guild.id);

    if (!queue) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      connection.on('stateChange', (oldState, newState) => {
        logger.debug(`Voice connection: ${oldState.status} -> ${newState.status}`);
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch (err) {
        logger.error({ status: connection.state.status, err }, 'Voice connection failed to reach Ready state');
        connection.destroy();
        throw new Error(`Could not connect to voice channel (stuck at: ${connection.state.status}).`);
      }

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
          this.queues.delete(guild.id);
        }
      });

      queue = new MusicQueue(connection);
      this.queues.set(guild.id, queue);
    }

    if (!queue.currentTrack) {
      await queue.playTrack(track);
      return { type: 'playing', title: track.title, duration: track.duration, thumbnail: track.thumbnail };
    } else {
      queue.tracks.push(track);
      return { type: 'added', title: track.title, position: queue.tracks.length };
    }
  }
}
