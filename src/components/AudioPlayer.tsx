import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Volume2, VolumeX, Music, SkipForward, SkipBack, Play } from "lucide-react";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";

interface AudioPlayerProps {
  tracks: AudioTrack[];
  announcements: Announcement[];
  /** Intervalo em minutos entre disparos de locução (padrão 5). */
  announcementIntervalMinutes?: number;
  musicVolume?: number;
  announcementVolume?: number;
  musicDuckVolume?: number;
}

interface PlaylistItem {
  id: string;
  name: string;
  filePath: string;
  type: "track" | "announcement";
}

const FADE_MS = 800;               // duração do ducking
const VOLUME_RAMP_MS = 200;        // ajuste suave ao mudar volume no painel
const MAX_CONSECUTIVE_ERRORS = 3;

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const AudioPlayer = ({
  tracks,
  announcements,
  announcementIntervalMinutes = 5,
  musicVolume = 0.45,
  announcementVolume = 1.0,
  musicDuckVolume = 0.08,
}: AudioPlayerProps) => {
  const musicRef = useRef<HTMLAudioElement>(null);
  const announcementRef = useRef<HTMLAudioElement>(null);
  const urlCache = useRef(new Map<string, string>());

  // === Web Audio graph ===
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const announcementGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const musicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const announcementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // === Filas ===
  const musicQueueRef = useRef<PlaylistItem[]>([]);
  const musicIndexRef = useRef(0);
  const announcementQueueRef = useRef<PlaylistItem[]>([]);
  const announcementIndexRef = useRef(0);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isPlayingAnnouncementRef = useRef(false);
  const musicErrorCountRef = useRef(0);

  // === Refs que espelham props para uso dentro de callbacks estáveis ===
  const musicVolumeRef = useRef(musicVolume);
  const announcementVolumeRef = useRef(announcementVolume);
  const musicDuckVolumeRef = useRef(musicDuckVolume);
  const intervalRef = useRef(announcementIntervalMinutes);

  const [currentName, setCurrentName] = useState("");
  const [currentPos, setCurrentPos] = useState("0/0");
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Chave estável baseada nos ids (evita reinicializar quando settings mudam)
  const tracksKey = useMemo(() => tracks.map((t) => t.id).join(","), [tracks]);
  const announcementsKey = useMemo(() => announcements.map((a) => a.id).join(","), [announcements]);

  const getUrl = useCallback((item: PlaylistItem): string => {
    const key = `${item.type}-${item.filePath}`;
    const cached = urlCache.current.get(key);
    if (cached) return cached;
    const bucket = item.type === "track" ? "audio-tracks" : "announcements";
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(item.filePath);
    urlCache.current.set(key, publicUrl);
    return publicUrl;
  }, []);

  // Inicializa Web Audio graph (lazy, só quando primeiro play acontece)
  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const music = musicRef.current;
    const announcement = announcementRef.current;
    if (!music || !announcement) return null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();

      // Elementos <audio> sempre em volume máximo — o volume real vive no GainNode
      music.volume = 1;
      announcement.volume = 1;

      const musicSrc = ctx.createMediaElementSource(music);
      const annSrc = ctx.createMediaElementSource(announcement);

      const musicGain = ctx.createGain();
      const annGain = ctx.createGain();
      const masterGain = ctx.createGain();

      // Limiter para uniformizar loudness entre faixas
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -6;
      compressor.knee.value = 6;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      musicGain.gain.value = musicVolumeRef.current;
      annGain.gain.value = announcementVolumeRef.current;
      masterGain.gain.value = 1;

      musicSrc.connect(musicGain).connect(masterGain);
      annSrc.connect(annGain).connect(masterGain);
      masterGain.connect(compressor).connect(ctx.destination);

      audioCtxRef.current = ctx;
      musicGainRef.current = musicGain;
      announcementGainRef.current = annGain;
      masterGainRef.current = masterGain;
      compressorRef.current = compressor;
      musicSourceRef.current = musicSrc;
      announcementSourceRef.current = annSrc;

      return ctx;
    } catch (e) {
      console.warn("[AudioPlayer] Web Audio init failed, falling back", e);
      return null;
    }
  }, []);

  const rampGain = useCallback((gain: GainNode | null, target: number, ms: number) => {
    const ctx = audioCtxRef.current;
    if (!gain || !ctx) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + ms / 1000);
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
    audio.preload = "auto";
    audio.load();

    setTimeout(() => {
      ensureAudioGraph();
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      audio.play()
        .then(() => setNeedsUserGesture(false))
        .catch((err) => {
          console.log("[AudioPlayer] Music autoplay blocked", err);
          setNeedsUserGesture(true);
        });
    }, 100);
  }, [getUrl, ensureAudioGraph]);

  const handleMusicEnded = useCallback(() => {
    musicErrorCountRef.current = 0;
    const next = musicIndexRef.current + 1;
    if (next >= musicQueueRef.current.length) {
      musicQueueRef.current = shuffle(musicQueueRef.current);
      playMusicIndex(0);
    } else {
      playMusicIndex(next);
    }
  }, [playMusicIndex]);

  const handleMusicError = useCallback(() => {
    musicErrorCountRef.current += 1;
    console.warn(`[AudioPlayer] Music error (${musicErrorCountRef.current})`);
    if (musicErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
      console.error("[AudioPlayer] Too many consecutive music errors, stopping.");
      return;
    }
    setTimeout(() => {
      const next = musicIndexRef.current + 1;
      if (musicQueueRef.current.length > 0) {
        playMusicIndex(next % musicQueueRef.current.length);
      }
    }, 500);
  }, [playMusicIndex]);

  // ========== LOCUÇÃO ==========
  const scheduleNextAnnouncement = useCallback(() => {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    if (announcementQueueRef.current.length === 0) return;
    const ms = Math.max(1, intervalRef.current) * 60 * 1000;
    announcementTimerRef.current = setTimeout(() => {
      playNextAnnouncement();
    }, ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playNextAnnouncement = useCallback(() => {
    const audio = announcementRef.current;
    const queue = announcementQueueRef.current;
    if (!audio || queue.length === 0) return;
    if (isPlayingAnnouncementRef.current) return;

    const idx = announcementIndexRef.current % queue.length;
    const item = queue[idx];
    announcementIndexRef.current = idx + 1;
    if (announcementIndexRef.current >= queue.length) {
      announcementQueueRef.current = shuffle(queue);
      announcementIndexRef.current = 0;
    }

    isPlayingAnnouncementRef.current = true;
    audio.src = getUrl(item);
    audio.load();

    ensureAudioGraph();
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});

    // Duck da música
    rampGain(musicGainRef.current, musicDuckVolumeRef.current, FADE_MS);
    // Locução no volume configurado
    rampGain(announcementGainRef.current, announcementVolumeRef.current, 50);

    audio.play().catch((err) => {
      console.warn("[AudioPlayer] Announcement play failed:", err);
      rampGain(musicGainRef.current, musicVolumeRef.current, FADE_MS);
      isPlayingAnnouncementRef.current = false;
      scheduleNextAnnouncement();
    });
  }, [getUrl, ensureAudioGraph, rampGain, scheduleNextAnnouncement]);

  const handleAnnouncementEnded = useCallback(() => {
    isPlayingAnnouncementRef.current = false;
    rampGain(musicGainRef.current, musicVolumeRef.current, FADE_MS);
    scheduleNextAnnouncement();
  }, [rampGain, scheduleNextAnnouncement]);

  const handleAnnouncementError = useCallback(() => {
    console.warn("[AudioPlayer] Announcement error, restoring music");
    isPlayingAnnouncementRef.current = false;
    rampGain(musicGainRef.current, musicVolumeRef.current, FADE_MS);
    scheduleNextAnnouncement();
  }, [rampGain, scheduleNextAnnouncement]);

  // ========== (a) Init de filas — só quando as LISTAS mudam ==========
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
    musicErrorCountRef.current = 0;

    setHasContent(trackItems.length > 0 || annItems.length > 0);

    if (trackItems.length > 0) {
      playMusicIndex(0);
    }
    scheduleNextAnnouncement();

    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracksKey, announcementsKey]);

  // ========== (b) Sync de volumes (sem reiniciar música) ==========
  useEffect(() => {
    musicVolumeRef.current = musicVolume;
    if (!isPlayingAnnouncementRef.current) {
      rampGain(musicGainRef.current, musicVolume, VOLUME_RAMP_MS);
    }
  }, [musicVolume, rampGain]);

  useEffect(() => {
    announcementVolumeRef.current = announcementVolume;
    if (isPlayingAnnouncementRef.current) {
      rampGain(announcementGainRef.current, announcementVolume, VOLUME_RAMP_MS);
    }
  }, [announcementVolume, rampGain]);

  useEffect(() => {
    musicDuckVolumeRef.current = musicDuckVolume;
    if (isPlayingAnnouncementRef.current) {
      rampGain(musicGainRef.current, musicDuckVolume, VOLUME_RAMP_MS);
    }
  }, [musicDuckVolume, rampGain]);

  // ========== (c) Sync do intervalo ==========
  useEffect(() => {
    intervalRef.current = announcementIntervalMinutes;
    // Só reprograma se não há locução tocando agora
    if (!isPlayingAnnouncementRef.current) {
      scheduleNextAnnouncement();
    }
  }, [announcementIntervalMinutes, scheduleNextAnnouncement]);

  // ========== Cleanup do AudioContext ao desmontar ==========
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // ========== Autoplay gesture recovery ==========
  useEffect(() => {
    if (!needsUserGesture) return;
    const resume = () => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
      const audio = musicRef.current;
      if (audio) {
        audio.muted = false;
        audio.play()
          .then(() => setNeedsUserGesture(false))
          .catch(() => {});
      }
    };
    // Tentativa 1: autoplay mudo → desmutar (funciona na maioria das Smart TVs)
    const tryMutedAutoplay = () => {
      const audio = musicRef.current;
      if (!audio) return;
      audio.muted = true;
      audio.play()
        .then(() => {
          // Sucesso tocando mudo — desmuta em seguida
          setTimeout(() => {
            if (!isMuted) audio.muted = false;
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
            setNeedsUserGesture(false);
          }, 300);
        })
        .catch(() => {
          // Continua aguardando gesto
        });
    };
    tryMutedAutoplay();
    const retryTimer = setInterval(tryMutedAutoplay, 3000);

    // Captura ampla de qualquer input (mouse, toque, controle remoto, teclado)
    const events = ["click", "pointerdown", "mousedown", "keydown", "keyup", "touchstart", "touchend", "wheel"];
    events.forEach((ev) =>
      document.addEventListener(ev, resume, { capture: true, passive: true } as AddEventListenerOptions)
    );
    return () => {
      clearInterval(retryTimer);
      events.forEach((ev) =>
        document.removeEventListener(ev, resume, { capture: true } as EventListenerOptions)
      );
    };
  }, [needsUserGesture, isMuted]);


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
      <audio ref={musicRef} onEnded={handleMusicEnded} onError={handleMusicError} preload="auto" crossOrigin="anonymous" />
      <audio ref={announcementRef} onEnded={handleAnnouncementEnded} onError={handleAnnouncementError} preload="auto" crossOrigin="anonymous" />

      {needsUserGesture && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
            musicRef.current?.play()
              .then(() => setNeedsUserGesture(false))
              .catch(() => {});
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="flex flex-col items-center gap-4 text-white text-center px-8">
            <div className="p-6 rounded-full bg-primary/20 border-2 border-primary animate-pulse">
              <Play className="h-16 w-16 fill-current text-primary" />
            </div>
            <p className="text-2xl font-bold tracking-tight">Ativar áudio</p>
            <p className="text-base opacity-80 max-w-md">
              Pressione qualquer tecla do controle remoto ou toque na tela para iniciar a música
            </p>
          </div>
        </div>
      )}

      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/40 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-primary shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate max-w-[200px] tracking-tight">{currentName}</p>
              <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Música {currentPos}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prev} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90">
                <SkipBack className="h-4 w-4 fill-current" />
              </button>
              <button onClick={next} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90">
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
              <button onClick={toggleMute} className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
