/** Shape of src/data/music.json, written by scripts/sync-music.ts. */

/** Last.fm's chart periods. */
export type PeriodKey = '7day' | '1month' | '3month' | '6month' | '12month' | 'overall';

export interface MusicArtist {
  name: string;
  plays: number;
  /** Your Last.fm library page for this artist. */
  url: string;
  /** Artist photo (Deezer), or null when none was found. */
  photo: string | null;
  /** Internal: the photo lookup has been done, so later syncs can skip it. */
  looked?: boolean;
}

export interface MusicTrack {
  name: string;
  artist: string;
  plays: number;
  /** Your Last.fm library page for this song. */
  url: string;
  /** Cover art (Apple), or null when none was found. */
  art: string | null;
  /** Apple's 30-second preview clip. */
  preview: string | null;
  /** The song on Apple Music. */
  apple: string | null;
  /** Internal: the Apple lookup has been done, so later syncs can skip it. */
  looked?: boolean;
}

export interface MusicPeriod {
  key: PeriodKey;
  artists: MusicArtist[];
  tracks: MusicTrack[];
}

export interface RecentTrack extends MusicTrack {
  /** When it was scrobbled (ISO), or the sync time if it was playing right then. */
  at: string;
  nowPlaying: boolean;
}

export interface Music {
  username: string;
  profile: string;
  fetchedAt: string | null;
  /** True for the made-up preview data in music.sample.json. */
  sample?: boolean;
  scrobbles: number | null;
  artistCount: number | null;
  /** When the Last.fm account started scrobbling (ISO). */
  since: string | null;
  recent: RecentTrack | null;
  periods: MusicPeriod[];
}
