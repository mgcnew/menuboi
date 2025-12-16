export type TransitionType = 
  | 'fade'
  | 'slide-left'
  | 'slide-right' 
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'crossfade'
  | 'push-left'
  | 'push-right';

export const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Deslizar Esquerda' },
  { value: 'slide-right', label: 'Deslizar Direita' },
  { value: 'slide-up', label: 'Deslizar Cima' },
  { value: 'slide-down', label: 'Deslizar Baixo' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'push-left', label: 'Push Esquerda' },
  { value: 'push-right', label: 'Push Direita' },
];

export const DEFAULT_DISPLAY_TIME = 10;
export const DEFAULT_TRANSITION_TYPE: TransitionType = 'fade';

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  order: number;
  uploadedAt: Date;
}

export interface Announcement {
  id: string;
  name: string;
  url: string;
  order: number;
  uploadedAt: Date;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackCount?: number;
  createdAt: Date;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  audioTrackId: string;
  order: number;
  track?: AudioTrack;
}