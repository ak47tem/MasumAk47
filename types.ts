
export interface SongSection {
  type: string; // e.g., Verse, Chorus, Bridge
  content: string;
}

export interface SongData {
  title: string;
  style: string;
  mood: string;
  lyrics: SongSection[];
  language: string;
  tempo?: number;
  topic?: string;
  version?: number; // Added version field
}

export interface GeneratedSong {
  id: string;
  data: SongData;
  albumArtUrl?: string;
  audioBuffer?: AudioBuffer;
  createdAt: number;
  status: 'queued' | 'generating_lyrics' | 'generating_art' | 'generating_audio' | 'completed' | 'error';
}

export enum GenerationState {
  IDLE = 'IDLE',
  GENERATING_LYRICS = 'GENERATING_LYRICS',
  GENERATING_ART = 'GENERATING_ART',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface SongRequest {
  mode: 'ai' | 'custom' | 'studio';
  topic?: string;
  customLyrics?: string;
  genre?: string;
  mood?: string;
  language?: string;
  tempo?: number;
  version: number; // Required version field
  autoEnhance?: boolean;
}
