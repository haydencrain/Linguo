import axios from 'axios';
import * as queryString from 'query-string';
import util from 'util';

export type Episode = {
  Id: number;
  Key: string;
  Season: number;
  EpisodeNumber: number;
  Title: string;
  Director: string;
  Writer: string;
  OriginalAirDate: string;
  WikiLink: string;
};

export type Frame = {
  Id: number;
  Episode: string;
  Timestamp: number;
};

export type Subtitle = {
  Id: number;
  RepresentativeTimestamp: number;
  Episode: string;
  StartTimestamp: number;
  EndTimestamp: number;
  Content: string;
  Language: string;
};

export type SearchResponse = Frame[];

export type CaptionResponse = {
  Episode: Episode;
  Frame: Frame;
  Subtitles: Subtitle[];
  Nearby: Frame[];
};

export class FrinkiacService {
  private static BASE_URL = 'https://frinkiac.com/';
  private static SEARCH_URL = `api/search?%s`;
  private static MEME_URL = 'meme/%s/%s.jpg?%s';
  private static CAPTION_URL = 'api/caption?%s';
  private static IMAGE_URL = 'img/%s/%s.jpg';
  private static RAND_URL = 'api/random';

  constructor() {}

  private get searchUrlFormat(): string {
    return `${FrinkiacService.BASE_URL}/${FrinkiacService.SEARCH_URL}`;
  }

  private get memeUrlFormat(): string {
    return `${FrinkiacService.BASE_URL}/${FrinkiacService.MEME_URL}`;
  }

  private get captionUrlFormat(): string {
    return `${FrinkiacService.BASE_URL}/${FrinkiacService.CAPTION_URL}`;
  }

  private get iamgeUrlFormat(): string {
    return `${FrinkiacService.BASE_URL}/${FrinkiacService.IMAGE_URL}`;
  }

  private get randUrlFormat(): string {
    return `${FrinkiacService.BASE_URL}/${FrinkiacService.RAND_URL}`;
  }

  private buildSearchUrl(search: string): string {
    const query = queryString.stringify({ q: search || '' });
    return util.format(this.searchUrlFormat, query);
  }

  private buildCaptionUrl(episode: string, timestamp: string): string {
    const query = queryString.stringify({ e: episode, t: timestamp });
    return util.format(this.captionUrlFormat, query);
  }

  imageUrl(episode: string, timestamp: string): string {
    return util.format(this.iamgeUrlFormat, episode, timestamp);
  }

  memeUrl(episode: string, timestamp: string, caption: string): string {
    // b64lines=Ymx1cnN0IG9mIHRpbWVzIQ==
    // eventually clean emojis
    let b64lines;
    if (typeof Buffer === 'function') {
      b64lines = new Buffer(caption).toString('base64');
    } else if (window && typeof window.btoa === 'function') {
      b64lines = window.btoa(caption);
    }

    const query = queryString.stringify({ b64lines });
    return util.format(this.memeUrlFormat, episode, timestamp, query);
  }

  async search(search: string): Promise<SearchResponse> {
    const url = this.buildSearchUrl(search);
    const { data } = await axios(url);
    return data;
  }

  async caption(episode: string, timestamp: string): Promise<CaptionResponse> {
    const url = this.buildCaptionUrl(episode, timestamp);
    const { data } = await axios(url);
    return data;
  }

  async random(): Promise<CaptionResponse> {
    const url = this.randUrlFormat;
    const { data } = await axios(url);
    return data;
  }
}
