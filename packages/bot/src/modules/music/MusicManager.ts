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
import play from 'play-dl';
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

const YT_URL_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/;
const SC_URL_RE = /^https?:\/\/(www\.)?soundcloud\.com/;

// Player clients tried in order for YouTube fallback.
// android_embedded returns pre-signed CDN URLs that skip n-challenge solving.
const YT_PLAYER_CLIENTS = ['android_embedded', 'android_vr', 'tv_embedded', 'ios', 'web'] as const;

let scInitialized = false;
async function ensureScInit(): Promise<void> {
  if (scInitialized) return;
  try {
    await play.setToken({ soundcloud: { client_id: 'auto' } });
    scInitialized = true;
    logger.debug('SoundCloud client initialized');
  } catch (err) {
    logger.warn({ err }, 'SoundCloud auto client_id failed, continuing without');
    scInitialized = true; // don't retry on every call
  }
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Search SoundCloud and return first result */
async function searchSoundCloud(query: string): Promise<{ title: string; url: string; duration?: string; thumbnail?: string }> {
  await ensureScInit();
  const results = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
  const track = results[0];
  if (!track || track.url === undefined) throw new Error('No SoundCloud results found');
  const sc = track as { name?: string; url: string; durationInSec?: number; thumbnail?: string };
  return {
    title: sc.name ?? 'Unknown',
    url: sc.url,
    duration: sc.durationInSec ? formatDuration(sc.durationInSec) : undefined,
    thumbnail: sc.thumbnail,
  };
}

/** Get SoundCloud track info from URL */
async function getSoundCloudInfo(url: string): Promise<{ title: string; url: string; duration?: string; thumbnail?: string }> {
  await ensureScInit();
  const info = await play.soundcloud(url);
  return {
    title: info.name ?? 'Unknown',
    url: info.url,
    duration: 'durationInSec' in info ? formatDuration((info as unknown as { durationInSec: number }).durationInSec) : undefined,
    thumbnail: 'thumbnail' in info ? (info as unknown as { thumbnail?: string }).thumbnail : undefined,
  };
}

/** Get YouTube stream URL via yt-dlp with multi-client fallback */
async function getYouTubeStreamUrl(videoUrl: string): Promise<string> {
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE;
  for (const client of YT_PLAYER_CLIENTS) {
    try {
      const args = [
        '--extractor-args', `youtube:player_client=${client}`,
        '--no-playlist',
        '--no-warnings',
        '-f', 'bestaudio[ext=webm]/bestaudio/best',
        '-g',
      ];
      if (cookiesFile) args.push('--cookies', cookiesFile);
      args.push(videoUrl);
      const { stdout } = await execFileAsync('yt-dlp', args, { timeout: 30_000 });
      const url = stdout.trim().split('\n')[0];
      if (url && url.startsWith('http')) {
        logger.debug({ client }, 'YouTube stream URL obtained');
        return url;
      }
    } catch (err) {
      const stderr = (err as { stderr?: string }).stderr ?? '';
      logger.debug({ client, stderr: stderr.slice(0, 300) }, `yt-dlp client ${client} failed`);
    }
  }
  throw new Error('yt-dlp failed with all player clients');
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
      if (YT_URL_RE.test(track.url)) {
        await this.playYouTube(track.url);
      } else {
        await this.playSoundCloud(track.url);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to play track');
      const next = this.tracks.shift();
      if (next) this.playTrack(next);
      else this.currentTrack = null;
    }
  }

  private async playSoundCloud(url: string): Promise<void> {
    await ensureScInit();
    const stream = await play.stream(url);
    this.resource = createAudioResource(stream.stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    this.resource.volume?.setVolume(this.volume / 100);
    this.player.play(this.resource);
  }

  private async playYouTube(url: string): Promise<void> {
    const directUrl = await getYouTubeStreamUrl(url);
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
      if (YT_URL_RE.test(query)) {
        // YouTube URL — get metadata from youtube-sr, stream via yt-dlp
        const video = await YouTube.getVideo(query);
        trackInfo = {
          title: video?.title ?? 'Unknown',
          url: query,
          duration: video?.durationFormatted,
          thumbnail: video?.thumbnail?.url,
        };
      } else if (SC_URL_RE.test(query)) {
        // SoundCloud URL
        trackInfo = await getSoundCloudInfo(query);
      } else {
        // Search query — default to SoundCloud
        trackInfo = await searchSoundCloud(query);
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
