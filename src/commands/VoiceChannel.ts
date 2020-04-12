import { Message, Guild, StreamDispatcher, TextChannel, DMChannel, NewsChannel } from 'discord.js';
import ytdl from 'ytdl-core';

type MessageChannel = TextChannel | DMChannel | NewsChannel;

class SongDetail {
  url: string;
  title: string;
  requester: string;

  constructor({ url, title, requester }: { url: string; title: string; requester: string }) {
    this.url = url;
    this.title = title;
    this.requester = requester;
  }
}

class GuildPlaylist {
  guild: Guild;
  queue: SongDetail[] = [];
  currentSong?: SongDetail;
  private dispatcher?: StreamDispatcher;
  private messageChannel?: MessageChannel;

  constructor(guild: Guild) {
    this.guild = guild;
  }

  private bindDispatcherListeners() {
    this.dispatcher.on('end', () => {
      this.dispatcher.destroy();
      this.play();
    });
    this.dispatcher.on('error', err => console.log(err));
  }

  get guildId() {
    return this.guild.id;
  }

  get queueDetails() {
    const listLimit = 15;
    let songItem: string[] = [];
    this.queue.forEach((song, i) => {
      songItem.push(`${i + 1}. ${song.title} - Requested by: ${song.requester}`);
    });

    let queueDetails = `__**Music Queue:**__ Currently **${this.queue.length}** songs queued`;
    if (this.queue.length > listLimit) {
      queueDetails += ' *[Only next 15 shown]*';
    }
    if (this.queue.length == 0) {
      queueDetails += '\nAdd some songs to the queue with the "add" command!';
    } else {
      queueDetails += `\n\`\`\`${songItem.slice(0, listLimit).join('\n')}\`\`\``;
    }
    return queueDetails;
  }

  setMessageChannel(channel: MessageChannel) {
    this.messageChannel = channel;
  }

  async add(url: string, requester: string): Promise<SongDetail> {
    try {
      const info = await ytdl.getInfo(url);
      const song = new SongDetail({
        url,
        title: info.title,
        requester
      });
      this.queue.push(song);
      return song;
    } catch (err) {
      throw new Error('Invalid youtube link: ' + err.message);
    }
  }

  play(): void {
    const song = this.queue.shift();
    this.currentSong = song;
    if (!this.currentSong) {
      this.messageChannel.send('No more songs left in the queue!');
      return undefined;
    }

    const stream = ytdl(this.currentSong.url, { filter: 'audioonly' });
    this.dispatcher = this.guild.voice.connection.play(stream);
    this.bindDispatcherListeners();
    this.messageChannel.send(`Playing: **${song.title}** as requested by: **${song.requester}**`);
  }

  pause() {
    this.dispatcher?.pause();
    this.messageChannel.send(`Playback Paused!`);
  }

  resume() {
    this.dispatcher?.resume();
    this.messageChannel.send(`Playback Resumed!`);
  }
}

export class VoiceChannelCommands {
  guildPlaylists: GuildPlaylist[] = [];

  constructor(private errorHandler?: (err: Error, errMsg: string, channel: Message['channel']) => void) {}

  private getGuildPlaylist(guild: Guild): GuildPlaylist {
    let playlist = this.guildPlaylists.find(p => p.guildId === guild.id);
    if (!playlist) {
      playlist = new GuildPlaylist(guild);
      this.guildPlaylists.push(playlist);
    }
    return playlist;
  }

  async join(message: Message, args: string[]) {
    const {
      member: { voice },
      guild,
      channel
    } = message;

    if (!voice.channel) {
      throw new Error('Unable to connect to voice channel! Ensure that you have joined a voice channel');
    }
    try {
      await voice.channel.join();
      // creates playlist if none exists
      this.getGuildPlaylist(guild);
      channel.send(`Connected to channel ${voice.channel.name}`);
    } catch (err) {
      this.errorHandler?.(err, err.message, channel);
    }
  }

  async leave(message: Message, args: string[]) {
    const {
      member: { voice },
      channel
    } = message;

    if (!voice.channel) {
      throw new Error('Not currently in a voice channel!');
    }
    try {
      voice.channel.leave();
      channel.send(`Left channel ${voice.channel.name}`);
    } catch (err) {
      this.errorHandler?.(err, err.message, message.channel);
    }
  }

  async add(message: Message, args: string[]) {
    const { guild, author, channel } = message;
    const [url] = args;

    if (!url) {
      throw new Error('Enter a url after the "add" command');
    }

    const guildPlaylist = this.getGuildPlaylist(guild);
    const song = await guildPlaylist.add(url, author.username);
    channel.send(`Added **${song.title}** to the queue`);
  }

  getQueue(message: Message, args: string[]) {
    const { guild, channel } = message;
    const guildPlaylist = this.getGuildPlaylist(guild);
    channel.send(guildPlaylist.queueDetails);
  }

  play(message: Message, args: string[]) {
    const { guild, channel } = message;
    const guildPlaylist = this.getGuildPlaylist(guild);
    guildPlaylist.setMessageChannel(channel);
    guildPlaylist.play();
  }

  pause(message: Message, args: string[]) {
    const { guild } = message;
    const guildPlaylist = this.getGuildPlaylist(guild);
    guildPlaylist.pause();
  }

  resume(message: Message, args: string[]) {
    const { guild } = message;
    const guildPlaylist = this.getGuildPlaylist(guild);
    guildPlaylist.resume();
  }
}
