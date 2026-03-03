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
import { spawn } from 'child_process';
import { YouTube } from 'youtube-sr';
import { logger } from '../../logger.js';

export interface Track {
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
  requestedBy: User;
}

// Public Invidious instances — tried in order, first success wins.
// Invidious solves YouTube's signature/n-challenge server-side and returns
// a direct, pre-signed CDN URL we can feed straight to ffmpeg.
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://iv.datura.network',
  'https://yt.artemislena.eu',
  'https://invidious.privacyredirect.com',
];

const YT_URL_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/;

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

interface InvidiousResponse {
  adaptiveFormats?: Array<{ url: string; type: string; bitrate?: string }>;
  formatStreams?: Array<{ url: string; type: string }>;
}

/** Get a direct audio stream URL via the Invidious public API */
async function getStreamUrl(videoUrl: string): Promise<string> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error(`Cannot extract video ID from: ${videoUrl}`);

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(12_000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        logger.debug({ instance, status: res.status }, 'Invidious returned error');
        continue;
      }

      const data = await res.json() as InvidiousResponse;

      // Prefer audio-only adaptive formats (opus/webm or aac/mp4), sorted by bitrate
      const audioFormats = (data.adaptiveFormats ?? [])
        .filter(f => f.type.startsWith('audio/'))
        .sort((a, b) => parseInt(b.bitrate ?? '0') - parseInt(a.bitrate ?? '0'));

      if (audioFormats[0]?.url) {
        logger.debug({ instance, videoId, type: audioFormats[0].type }, 'Invidious: got audio stream');
        return audioFormats[0].url;
      }

      // Fallback: combined video+audio format
      if (data.formatStreams?.[0]?.url) {
        logger.debug({ instance, videoId }, 'Invidious: falling back to combined format');
        return data.formatStreams[0].url;
      }
    } catch (err) {
      logger.debug({ instance, err: String(err) }, 'Invidious instance failed, trying next');
    }
  }

  throw new Error('All Invidious instances failed to provide a stream URL');
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

      // ffmpeg decodes any format (opus/webm, aac/mp4, etc.) and outputs raw PCM
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
      logger.error({ err }, 'Failed to play track');
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
      if (YT_URL_RE.test(query)) {
        // Direct YouTube URL — get metadata from youtube-sr
        const video = await YouTube.getVideo(query);
        trackInfo = {
          title: video?.title ?? 'Unknown',
          url: query,
          duration: video?.durationFormatted,
          thumbnail: video?.thumbnail?.url,
        };
      } else {
        // Search query — search YouTube for metadata, stream via Invidious
        const results = await YouTube.search(query, { limit: 1, type: 'video' });
        const video = results[0];
        if (!video?.url) throw new Error('No results found');
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
        debug: true,
      });

      connection.on('stateChange', (oldState, newState) => {
        logger.info(`Voice connection: ${oldState.status} -> ${newState.status}`);
      });

      connection.on('debug', (msg) => {
        logger.info(`[Voice WS] ${msg}`);
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch (err) {
        const failedStatus = connection.state.status;
        logger.error({ status: failedStatus, err }, 'Voice connection failed to reach Ready state');
        connection.destroy();
        this.queues.delete(guild.id);
        throw new Error(`Could not connect to voice channel (stuck at: ${failedStatus}).`);
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
