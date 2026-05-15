import { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Music, SkipForward, SkipBack } from "lucide-react";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";

interface AudioPlayerProps {
  tracks: AudioTrack[];
  announcements: Announcement[];
  /** Intervalo em minutos entre disparos de locução (padrão 5). */
  announcementIntervalMinutes?: number;
}

interface PlaylistItem {
  id: string;
  name: string;
  filePath: string;
  type: "track" | "announcement";
}

const MUSIC_VOLUME = 0.45;        // volume normal da música
const MUSIC_DUCK_VOLUME = 0.08;   // volume reduzido durante locução
const FADE_DURATION_MS = 800;     // duração do fade in/out

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const AudioPlayer = ({ tracks, announcements, announcementIntervalMinutes = 5 }: AudioPlayerProps) => {
  const musicRef = useRef<HTMLAudioElement>(null);
  const announcementRef = useRef<HTMLAudioElement>(null);
  const urlCache = useRef(new Map<string, string>());

  // Música
  const musicQueueRef = useRef<PlaylistItem[]>([]);
  const musicIndexRef = useRef(0);

  // Locução
  const announcementQueueRef = useRef<PlaylistItem[]>([]);
  const announcementIndexRef = useRef(0);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isPlayingAnnouncementRef = useRef(false);
  const fadeRafRef = useRef<number>();

  const [currentName, setCurrentName] = useState("");
  const [currentPos, setCurrentPos] = useState("0/0");
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getUrl = useCallback((item: PlaylistItem): string => {
    const key = `${item.type}-${item.filePath}`;
    const cached = urlCache.current.get(key);
    if (cached) return cached;
    const bucket = item.type === "track" ? "audio-tracks" : "announcements";
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(item.filePath);
    urlCache.current.set(key, publicUrl);
    return publicUrl;
  }, []);

  // Fade suave do volume
  const fadeVolume = useCallback((audio: HTMLAudioElement, to: number, duration: number) => {
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    const from = audio.volume;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      audio.volume = from + (to - from) * t;
      if (t < 1) fadeRafRef.current = requestAnimationFrame(step);
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, []);

  // ========== MÚSICA ==========
  const playMusicIndex = useCallback((index: number) => {
    const audio = musicRef.current;
    const queue = musicQueueRef.current;
    if (!audio || queue.length === 0) return;
    const idx = ((index % queue.length) + queue.length) % queue.length;
    musicIndexRef.current = idx;
    const item = queue[idx];
    setCurrentName(item.name);
    setCurrentPos(`${idx + 1}/${queue.length}`);
    audio.src = getUrl(item);
    // Se já estamos em ducking, mantém volume baixo
    audio.volume = isPlayingAnnouncementRef.current ? MUSIC_DUCK_VOLUME : MUSIC_VOLUME;
    audio.preload = "auto";
    audio.load();
    setTimeout(() => {
      audio.play().catch(() => console.log("[AudioPlayer] Music autoplay blocked"));
    }, 100);
  }, [getUrl]);

  const handleMusicEnded = useCallback(() => {
    const next = musicIndexRef.current + 1;
    if (next >= musicQueueRef.current.length) {
      musicQueueRef.current = shuffle(musicQueueRef.current);
      playMusicIndex(0);
    } else {
      playMusicIndex(next);
    }
  }, [playMusicIndex]);

  const handleMusicError = useCallback(() => {
    console.warn("[AudioPlayer] Music error, skipping");
    setTimeout(() => {
      const next = musicIndexRef.current + 1;
      if (musicQueueRef.current.length > 0) {
        playMusicIndex(next % musicQueueRef.current.length);
      }
    }, 500);
  }, [playMusicIndex]);

  // ========== LOCUÇÃO ==========
  const playNextAnnouncement = useCallback(() => {
    const audio = announcementRef.current;
    const queue = announcementQueueRef.current;
    const music = musicRef.current;
    if (!audio || queue.length === 0) return;

    const idx = announcementIndexRef.current % queue.length;
    const item = queue[idx];
    announcementIndexRef.current = idx + 1;
    if (announcementIndexRef.current >= queue.length) {
      announcementQueueRef.current = shuffle(queue);
      announcementIndexRef.current = 0;
    }

    isPlayingAnnouncementRef.current = true;
    audio.src = getUrl(item);
    audio.volume = 1.0;
    audio.load();

    // Duck music
    if (music) fadeVolume(music, MUSIC_DUCK_VOLUME, FADE_DURATION_MS);

    audio.play().catch((err) => {
      console.warn("[AudioPlayer] Announcement play failed:", err);
      // Restaura música e reagenda
      if (music) fadeVolume(music, MUSIC_VOLUME, FADE_DURATION_MS);
      isPlayingAnnouncementRef.current = false;
      scheduleNextAnnouncement();
    });
  }, [getUrl, fadeVolume]);

  const scheduleNextAnnouncement = useCallback(() => {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    if (announcementQueueRef.current.length === 0) return;
    const ms = Math.max(1, announcementIntervalMinutes) * 60 * 1000;
    announcementTimerRef.current = setTimeout(() => {
      playNextAnnouncement();
    }, ms);
  }, [announcementIntervalMinutes, playNextAnnouncement]);

  const handleAnnouncementEnded = useCallback(() => {
    isPlayingAnnouncementRef.current = false;
    const music = musicRef.current;
    if (music) fadeVolume(music, MUSIC_VOLUME, FADE_DURATION_MS);
    scheduleNextAnnouncement();
  }, [fadeVolume, scheduleNextAnnouncement]);

  const handleAnnouncementError = useCallback(() => {
    console.warn("[AudioPlayer] Announcement error, restoring music");
    isPlayingAnnouncementRef.current = false;
    const music = musicRef.current;
    if (music) fadeVolume(music, MUSIC_VOLUME, FADE_DURATION_MS);
    scheduleNextAnnouncement();
  }, [fadeVolume, scheduleNextAnnouncement]);

  // ========== Init / re-init ==========
  useEffect(() => {
    urlCache.current.clear();

    const trackItems: PlaylistItem[] = tracks.map((t) => ({
      id: t.id, name: t.name, filePath: t.url, type: "track",
    }));
    const annItems: PlaylistItem[] = announcements.map((a) => ({
      id: a.id, name: a.name, filePath: a.url, type: "announcement",
    }));

    musicQueueRef.current = shuffle(trackItems);
    musicIndexRef.current = 0;
    announcementQueueRef.current = shuffle(annItems);
    announcementIndexRef.current = 0;

    setHasContent(trackItems.length > 0 || annItems.length > 0);

    if (trackItems.length > 0) {
      playMusicIndex(0);
    }
    scheduleNextAnnouncement();

    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, [tracks, announcements, playMusicIndex, scheduleNextAnnouncement]);

  // ========== Controles ==========
  const toggleMute = useCallback(() => {
    const m = musicRef.current; const a = announcementRef.current;
    const newMuted = !isMuted;
    if (m) m.muted = newMuted;
    if (a) a.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const next = useCallback(() => {
    const n = musicIndexRef.current + 1;
    if (n >= musicQueueRef.current.length) {
      musicQueueRef.current = shuffle(musicQueueRef.current);
      playMusicIndex(0);
    } else {
      playMusicIndex(n);
    }
  }, [playMusicIndex]);

  const prev = useCallback(() => {
    const p = musicIndexRef.current > 0 ? musicIndexRef.current - 1 : musicQueueRef.current.length - 1;
    playMusicIndex(p);
  }, [playMusicIndex]);

  useEffect(() => {
    const handleMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  if (!hasContent) return null;

  return (
    <>
      <audio ref={musicRef} onEnded={handleMusicEnded} onError={handleMusicError} preload="auto" />
      <audio ref={announcementRef} onEnded={handleAnnouncementEnded} onError={handleAnnouncementError} preload="auto" />

      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/80 text-white p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate max-w-[200px]">{currentName}</p>
              <p className="text-xs opacity-75">{currentPos}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prev} className="p-2 hover:bg-white/10 rounded-full">
                <SkipBack className="h-4 w-4" />
              </button>
              <button onClick={next} className="p-2 hover:bg-white/10 rounded-full">
                <SkipForward className="h-4 w-4" />
              </button>
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
