export type TransitionType =
  | 'fade'
  | 'crossfade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur'
  | 'ken-burns'
  | 'wipe-left'
  | 'wipe-right'
  | 'flip';

export const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'fade', label: 'Fade' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'slide-left', label: 'Deslizar Esquerda' },
  { value: 'slide-right', label: 'Deslizar Direita' },
  { value: 'slide-up', label: 'Deslizar Cima' },
  { value: 'slide-down', label: 'Deslizar Baixo' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'blur', label: 'Desfoque' },
  { value: 'ken-burns', label: 'Ken Burns' },
  { value: 'wipe-left', label: 'Wipe Esquerda' },
  { value: 'wipe-right', label: 'Wipe Direita' },
  { value: 'flip', label: 'Flip' },
];

export const DEFAULT_DISPLAY_TIME = 10;
export const DEFAULT_TRANSITION_TYPE: TransitionType = 'fade';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_OPTIONS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'mon', label: 'Segunda', short: 'Seg' },
  { value: 'tue', label: 'Terça', short: 'Ter' },
  { value: 'wed', label: 'Quarta', short: 'Qua' },
  { value: 'thu', label: 'Quinta', short: 'Qui' },
  { value: 'fri', label: 'Sexta', short: 'Sex' },
  { value: 'sat', label: 'Sábado', short: 'Sáb' },
  { value: 'sun', label: 'Domingo', short: 'Dom' },
];

export const getCurrentDayOfWeek = (): DayOfWeek => {
  const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
};

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

// Slideshow Settings Types
export type SlideshowTheme = 'dark' | 'light' | 'minimal' | 'branded';
export type WidgetPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';

export const THEME_OPTIONS: { value: SlideshowTheme; label: string; description: string }[] = [
  { value: 'dark', label: 'Escuro', description: 'Fundo preto, ideal para ambientes escuros' },
  { value: 'light', label: 'Claro', description: 'Fundo branco, ideal para ambientes claros' },
  { value: 'minimal', label: 'Minimal', description: 'Sem sobreposições, apenas imagens' },
  { value: 'branded', label: 'Branded', description: 'Exibe logo da empresa' },
];

export const POSITION_OPTIONS: { value: WidgetPosition; label: string }[] = [
  { value: 'top-left', label: 'Superior Esquerda' },
  { value: 'top-right', label: 'Superior Direita' },
  { value: 'bottom-left', label: 'Inferior Esquerda' },
  { value: 'bottom-right', label: 'Inferior Direita' },
  { value: 'bottom-center', label: 'Inferior Centro' },
];

export interface SlideshowSettings {
  id: string;
  theme: SlideshowTheme;
  showClock: boolean;
  showDate: boolean;
  showWeather: boolean;
  weatherLocation: string;
  weatherLat: number;
  weatherLon: number;
  showLogo: boolean;
  logoUrl: string | null;
  logoPosition: WidgetPosition;
  customMessage: string | null;
  customMessagePosition: WidgetPosition;
  announcementIntervalMinutes: number;
  musicVolume: number;
  announcementVolume: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_SLIDESHOW_SETTINGS: Omit<SlideshowSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  theme: 'dark',
  showClock: true,
  showDate: true,
  showWeather: false,
  weatherLocation: 'São Paulo',
  weatherLat: -23.5505,
  weatherLon: -46.6333,
  showLogo: false,
  logoUrl: null,
  logoPosition: 'top-left',
  customMessage: null,
  customMessagePosition: 'bottom-center',
  announcementIntervalMinutes: 5,
  musicVolume: 0.45,
  announcementVolume: 1.0,
};