import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Volume2, VolumeX, Music, SkipForward, SkipBack } from "lucide-react";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { isSmartTV } from "@/hooks/use-remote-navigation";

interface AudioPlayerProps {
  tracks: AudioTrack[];
  announcements: Announcement[];
  /** Intervalo em minutos entre disparos de locução (padrão 5). */
  announcementIntervalMinutes?: number;
  musicVolume?: number;
  announcementVolume?: number;
  musicDuckVolume?: number;
  /** Tempo (ms) para a música abaixar antes de a voz entrar. */
  duckFadeDownMs?: number;
  /** Tempo (ms) para a música voltar ao volume normal depois da voz. */
  duckFadeUpMs?: number;
  /** Aleatória (padrão) ou na ordem da lista/playlist. */
  shuffleMusic?: boolean;
  /** Pedido do painel para tocar uma locução agora; muda `seq` a cada pedido. */
  announcementRequest?: { seq: number; announcementId?: string };
}

interface PlaylistItem {
  id: string;
  name: string;
  filePath: string;
  type: "track" | "announcement";
}

/**
 * Ciclo da locução:
 * idle → loading (baixa o arquivo, música normal) → ducking (música abaixando)
 * → playing (voz) → restoring (respiro antes de a música voltar) → idle
 */
type AnnouncementPhase = "idle" | "loading" | "ducking" | "playing" | "restoring";

const DEFAULT_DUCK_DOWN_MS = 900;  // tempo para a música abaixar antes da voz
const DUCK_SETTLE_MS = 150;        // folga após o fade antes de a voz entrar
const DEFAULT_DUCK_UP_MS = 1600;   // retorno da música, mais lento que a descida
const MAX_DUCK_FADE_MS = 10000;
const ANNOUNCEMENT_TAIL_MS = 500;  // respiro depois da voz antes de subir a música
const ANNOUNCEMENT_LOAD_TIMEOUT_MS = 10000;
const ANNOUNCEMENT_FALLBACK_MAX_MS = 5 * 60 * 1000; // quando o arquivo não informa duração
const ANNOUNCEMENT_OVERRUN_MS = 15000;
const VOLUME_RAMP_MS = 200;        // ajuste suave ao mudar volume no painel
const TICK_MS = 1000;
const MUSIC_WATCHDOG_TICKS = 5;
const MAX_CONSECUTIVE_ERRORS = 3;
const TV_RETRY_MS = 2000;

const shuffle = <T,>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Atualiza a fila sem reiniciar a ordem: mantém o que já tocou e o que falta,
 * remove itens apagados e sorteia a posição dos novos entre os que faltam
 * (nunca na frente do item atual).
 */
const mergeQueue = (queue: PlaylistItem[], index: number, items: PlaylistItem[]) => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const known = new Set(queue.map((q) => q.id));
  const keep = (q: PlaylistItem) => byId.get(q.id)!;
  const played = queue.slice(0, index).filter((q) => byId.has(q.id)).map(keep);
  const upcoming = queue.slice(index).filter((q) => byId.has(q.id)).map(keep);
  for (const item of items) {
    if (known.has(item.id)) continue;
    const min = upcoming.length > 0 ? 1 : 0;
    const pos = min + Math.floor(Math.random() * (upcoming.length - min + 1));
    upcoming.splice(pos, 0, item);
  }
  return { queue: [...played, ...upcoming], index: played.length };
};

const clampFadeMs = (ms: number) => Math.min(MAX_DUCK_FADE_MS, Math.max(0, Math.round(ms) || 0));

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Espera o elemento ter dados suficientes para tocar sem engasgar. */
const waitUntilPlayable = (audio: HTMLAudioElement, timeoutMs: number) =>
  new Promise<boolean>((resolve) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      resolve(true);
      return;
    }
    const done = (ok: boolean) => {
      clearTimeout(timer);
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onFail);
      resolve(ok);
    };
    const onReady = () => done(true);
    const onFail = () => done(false);
    const timer = setTimeout(() => done(false), timeoutMs);
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("error", onFail);
  });

export const AudioPlayer = ({
  tracks,
  announcements,
  announcementIntervalMinutes = 5,
  musicVolume = 0.45,
  announcementVolume = 1.0,
  musicDuckVolume = 0.08,
  duckFadeDownMs = DEFAULT_DUCK_DOWN_MS,
  duckFadeUpMs = DEFAULT_DUCK_UP_MS,
  shuffleMusic = true,
  announcementRequest,
}: AudioPlayerProps) => {
  const musicRef = useRef<HTMLAudioElement>(null);
  const announcementRef = useRef<HTMLAudioElement>(null);
  const urlCache = useRef(new Map<string, string>());
  const warmedUrls = useRef(new Set<string>());
  const tvMode = useRef(isSmartTV()).current;

  // === Web Audio graph ===
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const announcementGainRef = useRef<GainNode | null>(null);
  const nativeFadeFrameRef = useRef<{ music?: number; announcement?: number }>({});
  const nativeTargetRef = useRef({ music: musicVolume, announcement: announcementVolume });

  // === Filas ===
  const musicQueueRef = useRef<PlaylistItem[]>([]);
  const musicIndexRef = useRef(0);
  const announcementQueueRef = useRef<PlaylistItem[]>([]);
  const announcementIndexRef = useRef(0);
  const musicErrorCountRef = useRef(0);

  // === Estado da locução ===
  const phaseRef = useRef<AnnouncementPhase>("idle");
  const phaseStartedAtRef = useRef(0);
  const duckEngagedRef = useRef(false);
  /** Base do intervalo: fim da última locução (ou início do player). */
  const intervalBaseRef = useRef<number | null>(null);
  /** Invalida timers/eventos de uma locução anterior. */
  const announcementTokenRef = useRef(0);
  const announcementTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // === Refs que espelham props/estado para uso dentro de callbacks estáveis ===
  const musicVolumeRef = useRef(musicVolume);
  const announcementVolumeRef = useRef(announcementVolume);
  const musicDuckVolumeRef = useRef(musicDuckVolume);
  const intervalRef = useRef(announcementIntervalMinutes);
  const duckDownMsRef = useRef(clampFadeMs(duckFadeDownMs));
  const duckUpMsRef = useRef(clampFadeMs(duckFadeUpMs));
  const shuffleMusicRef = useRef(shuffleMusic);
  duckDownMsRef.current = clampFadeMs(duckFadeDownMs);
  duckUpMsRef.current = clampFadeMs(duckFadeUpMs);
  const isMutedRef = useRef(false);

  const [currentName, setCurrentName] = useState("");
  const [currentPos, setCurrentPos] = useState("0/0");
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const hasContent = tracks.length > 0 || announcements.length > 0;

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

  /**
   * Baixa o arquivo inteiro uma vez pelo service worker para que ele fique no cache
   * de áudio. O <audio> faz pedidos parciais (Range/206), que sozinhos nunca são
   * guardados — sem isso cada repetição da faixa gasta egress do Storage de novo.
   */
  const warmCache = useCallback((item: PlaylistItem | undefined) => {
    if (!item || !navigator.serviceWorker?.controller) return;
    const url = getUrl(item);
    if (warmedUrls.current.has(url)) return;
    warmedUrls.current.add(url);
    fetch(url, { mode: "cors", credentials: "omit" })
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(res.status)))
      .catch(() => warmedUrls.current.delete(url));
  }, [getUrl]);

  // Inicializa Web Audio graph (lazy, só quando primeiro play acontece)
  const ensureAudioGraph = useCallback(() => {
    // Smart TVs tend to be inconsistent with AudioContext unlock/resume.
    // On TVs, use the native <audio> pipeline and control volume directly.
    if (tvMode) return null;
    if (audioCtxRef.current) return audioCtxRef.current;
    const music = musicRef.current;
    const announcement = announcementRef.current;
    if (!music || !announcement) return null;

    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx: AudioContext = new AudioCtx();

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

      musicGain.gain.value = duckEngagedRef.current ? musicDuckVolumeRef.current : musicVolumeRef.current;
      annGain.gain.value = announcementVolumeRef.current;
      masterGain.gain.value = 1;

      musicSrc.connect(musicGain).connect(masterGain);
      annSrc.connect(annGain).connect(masterGain);
      masterGain.connect(compressor).connect(ctx.destination);

      // Com o graph ativo, o volume real vive no GainNode; os elementos ficam em 1
      // (antes o volume era aplicado duas vezes: no elemento e no gain).
      Object.values(nativeFadeFrameRef.current).forEach((f) => f && cancelAnimationFrame(f));
      music.volume = 1;
      announcement.volume = 1;

      audioCtxRef.current = ctx;
      musicGainRef.current = musicGain;
      announcementGainRef.current = annGain;

      return ctx;
    } catch (e) {
      console.warn("[AudioPlayer] Web Audio init failed, falling back", e);
      return null;
    }
  }, [tvMode]);

  const resumeAudioGraph = useCallback(() => {
    if (tvMode) return;
    ensureAudioGraph();
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  }, [ensureAudioGraph, tvMode]);

  const rampGain = useCallback((gain: GainNode, target: number, ms: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const param = gain.gain;
    if (typeof param.cancelAndHoldAtTime === "function") {
      param.cancelAndHoldAtTime(now);
    } else {
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
    }
    if (ms <= 0) {
      param.setValueAtTime(target, now);
      return;
    }
    // Curva exponencial (constante de tempo = ms/4 ≈ 98% do alvo ao fim do fade):
    // soa natural ao ouvido e não estala, mesmo partindo de um fade em andamento.
    param.setTargetAtTime(target, now, ms / 4000);
  }, []);

  const fadeNativeVolume = useCallback((
    audio: HTMLAudioElement | null,
    target: number,
    ms: number,
    channel: "music" | "announcement"
  ) => {
    const clamped = Math.min(1, Math.max(0, target));
    nativeTargetRef.current[channel] = clamped;
    if (!audio) return;
    const frames = nativeFadeFrameRef.current;
    if (frames[channel]) cancelAnimationFrame(frames[channel]!);

    if (ms <= 0) {
      audio.volume = clamped;
      return;
    }

    // Interpola em escala perceptual (raiz) para a descida não parecer abrupta no fim
    const start = Math.sqrt(audio.volume);
    const end = Math.sqrt(clamped);
    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / ms);
      const level = start + (end - start) * easeInOut(progress);
      audio.volume = Math.min(1, Math.max(0, level * level));
      if (progress < 1) {
        frames[channel] = requestAnimationFrame(step);
      }
    };
    frames[channel] = requestAnimationFrame(step);
  }, []);

  const usingGraph = () => !tvMode && !!audioCtxRef.current;

  const applyMusicVolume = useCallback((target: number, ms: number) => {
    if (!tvMode && musicGainRef.current && audioCtxRef.current) {
      rampGain(musicGainRef.current, target, ms);
      return;
    }
    fadeNativeVolume(musicRef.current, target, ms, "music");
  }, [fadeNativeVolume, rampGain, tvMode]);

  const applyAnnouncementVolume = useCallback((target: number, ms: number) => {
    if (!tvMode && announcementGainRef.current && audioCtxRef.current) {
      rampGain(announcementGainRef.current, target, ms);
      return;
    }
    fadeNativeVolume(announcementRef.current, target, ms, "announcement");
  }, [fadeNativeVolume, rampGain, tvMode]);

  const currentMusicTarget = () =>
    duckEngagedRef.current ? musicDuckVolumeRef.current : musicVolumeRef.current;

  /** Volume do elemento: 1 com Web Audio, alvo atual no modo nativo. */
  const syncMusicElementVolume = (audio: HTMLAudioElement) => {
    audio.volume = usingGraph() ? 1 : Math.min(1, Math.max(0, currentMusicTarget()));
  };

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
    audio.autoplay = true;
    audio.muted = isMutedRef.current;
    syncMusicElementVolume(audio);
    audio.load();

    setTimeout(() => {
      resumeAudioGraph();
      audio.play()
        .then(() => setNeedsUserGesture(false))
        .catch((err) => {
          console.log("[AudioPlayer] Music autoplay blocked", err);
          if (tvMode) {
            setNeedsUserGesture(true);
            return;
          }
          // Fallback: toca mudo (Smart TVs permitem) e sinaliza para desmutar
          audio.muted = true;
          audio.play()
            .then(() => {
              setNeedsUserGesture(true);
            })
            .catch(() => {
              setNeedsUserGesture(true);
            });
        });
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUrl, resumeAudioGraph, tvMode]);

  const playNextMusic = useCallback(() => {
    const next = musicIndexRef.current + 1;
    if (next >= musicQueueRef.current.length) {
      // Fim da playlist: recomeça do zero (loop infinito), reembaralhando se aleatória
      if (shuffleMusicRef.current) musicQueueRef.current = shuffle(musicQueueRef.current);
      playMusicIndex(0);
    } else {
      playMusicIndex(next);
    }
  }, [playMusicIndex]);

  const handleMusicEnded = useCallback(() => {
    musicErrorCountRef.current = 0;
    playNextMusic();
  }, [playNextMusic]);

  const handleMusicPlaying = useCallback(() => {
    musicErrorCountRef.current = 0;
    // Enquanto esta toca, deixa a próxima pronta no cache
    const queue = musicQueueRef.current;
    if (queue.length > 1) warmCache(queue[(musicIndexRef.current + 1) % queue.length]);
  }, [warmCache]);

  const handleMusicError = useCallback(() => {
    const audio = musicRef.current;
    if (!audio?.getAttribute("src")) return; // erro ao limpar a fonte, não de rede
    musicErrorCountRef.current += 1;
    console.warn(`[AudioPlayer] Music error (${musicErrorCountRef.current})`);
    if (musicQueueRef.current.length === 0) return;
    // Nunca para de vez: se houver muitos erros seguidos, apenas espera mais antes de tentar de novo
    const delay = musicErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS ? 10000 : 500;
    if (musicErrorCountRef.current >= MAX_CONSECUTIVE_ERRORS * 2) {
      musicErrorCountRef.current = 0;
    }
    setTimeout(() => {
      if (musicQueueRef.current.length > 0) playNextMusic();
    }, delay);
  }, [playNextMusic]);

  // ========== LOCUÇÃO ==========
  const clearAnnouncementTimers = () => {
    announcementTimersRef.current.forEach(clearTimeout);
    announcementTimersRef.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    announcementTimersRef.current.push(setTimeout(fn, ms));
  };

  const setPhase = (phase: AnnouncementPhase) => {
    phaseRef.current = phase;
    phaseStartedAtRef.current = Date.now();
  };

  /** Encerra a locução atual (ou a tentativa) e devolve a música ao volume normal. */
  const finishAnnouncement = useCallback((reason: string) => {
    if (phaseRef.current === "idle" || phaseRef.current === "restoring") return;
    if (reason !== "ended") console.warn(`[AudioPlayer] Announcement finished early: ${reason}`);
    clearAnnouncementTimers();
    const token = ++announcementTokenRef.current;
    const wasDucked = duckEngagedRef.current;
    announcementRef.current?.pause();
    setPhase("restoring");
    intervalBaseRef.current = Date.now();

    later(() => {
      if (token !== announcementTokenRef.current) return;
      duckEngagedRef.current = false;
      if (wasDucked) applyMusicVolume(musicVolumeRef.current, duckUpMsRef.current);
      setPhase("idle");
      const queue = announcementQueueRef.current;
      warmCache(queue[announcementIndexRef.current % Math.max(1, queue.length)]);
    }, wasDucked ? ANNOUNCEMENT_TAIL_MS : 0);
  }, [applyMusicVolume, warmCache]);

  /** Toca a próxima da fila ou, com `announcementId`, uma locução específica (teste do painel). */
  const startAnnouncement = useCallback((announcementId?: string) => {
    const audio = announcementRef.current;
    const queue = announcementQueueRef.current;
    if (!audio || queue.length === 0 || phaseRef.current !== "idle") return false;

    let item: PlaylistItem | undefined;
    if (announcementId) {
      item = queue.find((q) => q.id === announcementId);
      if (!item) return false;
    } else {
      if (announcementIndexRef.current >= queue.length) {
        announcementQueueRef.current = shuffle(queue);
        announcementIndexRef.current = 0;
      }
      item = announcementQueueRef.current[announcementIndexRef.current];
      announcementIndexRef.current += 1;
    }

    clearAnnouncementTimers();
    const token = ++announcementTokenRef.current;
    setPhase("loading");

    // 1) Carrega a locução com a música ainda no volume normal
    audio.src = getUrl(item);
    audio.preload = "auto";
    audio.muted = isMutedRef.current;
    audio.volume = usingGraph() ? 1 : Math.min(1, Math.max(0, announcementVolumeRef.current));
    audio.load();

    waitUntilPlayable(audio, ANNOUNCEMENT_LOAD_TIMEOUT_MS).then((ready) => {
      if (token !== announcementTokenRef.current) return;
      if (!ready) {
        finishAnnouncement("load timeout/error");
        return;
      }

      // 2) Abaixa a música e só então solta a voz
      resumeAudioGraph();
      applyAnnouncementVolume(announcementVolumeRef.current, 0);
      duckEngagedRef.current = true;
      const downMs = duckDownMsRef.current;
      applyMusicVolume(musicDuckVolumeRef.current, downMs);
      setPhase("ducking");

      later(() => {
        if (token !== announcementTokenRef.current) return;
        setPhase("playing");
        audio.play().catch((err) => {
          if (token !== announcementTokenRef.current) return;
          finishAnnouncement(`play failed: ${err?.name ?? err}`);
        });
      }, downMs + DUCK_SETTLE_MS);
    });
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getUrl, resumeAudioGraph, applyAnnouncementVolume, applyMusicVolume, finishAnnouncement]);

  const handleAnnouncementEnded = useCallback(() => {
    if (phaseRef.current === "playing") finishAnnouncement("ended");
  }, [finishAnnouncement]);

  const handleAnnouncementError = useCallback(() => {
    const phase = phaseRef.current;
    if (phase === "ducking" || phase === "playing") finishAnnouncement("media error");
    // Em "loading", waitUntilPlayable já trata o erro
  }, [finishAnnouncement]);

  // ========== Relógio único: agenda locuções, vigia travamentos e a música ==========
  const startAnnouncementRef = useRef(startAnnouncement);
  const finishAnnouncementRef = useRef(finishAnnouncement);
  const playMusicIndexRef = useRef(playMusicIndex);
  const handleMusicEndedRef = useRef(handleMusicEnded);
  startAnnouncementRef.current = startAnnouncement;
  finishAnnouncementRef.current = finishAnnouncement;
  playMusicIndexRef.current = playMusicIndex;
  handleMusicEndedRef.current = handleMusicEnded;

  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const phase = phaseRef.current;

      // Comparar com o relógio (e não com um setTimeout longo) mantém o intervalo
      // correto mesmo com timers atrasados pelo navegador/TV.
      if (phase === "idle" && announcementQueueRef.current.length > 0) {
        if (intervalBaseRef.current === null) intervalBaseRef.current = now;
        const due = intervalBaseRef.current + Math.max(1, intervalRef.current) * 60 * 1000;
        if (now >= due) startAnnouncementRef.current();
      }

      // Segurança: se a locução travar (sem "ended"), a música não fica abaixada para sempre
      if (phase === "playing") {
        const duration = announcementRef.current?.duration;
        const maxMs = Number.isFinite(duration) && duration! > 0
          ? duration! * 1000 + ANNOUNCEMENT_OVERRUN_MS
          : ANNOUNCEMENT_FALLBACK_MAX_MS;
        if (now - phaseStartedAtRef.current > maxMs) finishAnnouncementRef.current("stalled");
      }

      ticks += 1;
      if (ticks % MUSIC_WATCHDOG_TICKS !== 0) return;
      // Watchdog: garante que a música nunca fique parada (inclusive durante a locução).
      // Em TV, não insiste durante a voz: alguns aparelhos só tocam um áudio por vez.
      const audio = musicRef.current;
      if (!audio || musicQueueRef.current.length === 0) return;
      if (tvMode && phase === "playing") return;
      if (!audio.getAttribute("src")) {
        playMusicIndexRef.current(musicIndexRef.current);
      } else if (audio.ended) {
        handleMusicEndedRef.current();
      } else if (audio.paused) {
        audio.play().catch(() => {});
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [tvMode]);

  // ========== (a) Filas — atualiza sem interromper o que está tocando ==========
  useEffect(() => {
    const trackItems: PlaylistItem[] = tracks.map((t) => ({
      id: t.id, name: t.name, filePath: t.url, type: "track",
    }));
    const audio = musicRef.current;

    if (trackItems.length === 0) {
      musicQueueRef.current = [];
      musicIndexRef.current = 0;
      if (audio?.getAttribute("src")) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      return;
    }

    const shuffleChanged = shuffleMusicRef.current !== shuffleMusic;
    shuffleMusicRef.current = shuffleMusic;
    const order = (items: PlaylistItem[]) => (shuffleMusic ? shuffle(items) : items);

    const playingIndex = musicIndexRef.current;
    const playingId = audio?.getAttribute("src") ? musicQueueRef.current[playingIndex]?.id : undefined;
    if (!playingId) {
      musicQueueRef.current = order(trackItems);
      musicErrorCountRef.current = 0;
      playMusicIndex(0);
      return;
    }

    const keepPlaying = (queue: PlaylistItem[], index: number) => {
      musicQueueRef.current = queue;
      musicIndexRef.current = index;
      setCurrentPos(`${index + 1}/${queue.length}`);
    };

    if (!shuffleMusic) {
      // Ordem da lista: segue a faixa atual na nova posição, sem reiniciar
      const index = trackItems.findIndex((t) => t.id === playingId);
      musicQueueRef.current = trackItems;
      if (index >= 0) keepPlaying(trackItems, index);
      else playMusicIndex(playingIndex < trackItems.length ? playingIndex : 0);
      return;
    }

    if (shuffleChanged) {
      // Passou a ser aleatória: a atual continua e o resto é sorteado depois dela
      const current = trackItems.find((t) => t.id === playingId);
      const rest = shuffle(trackItems.filter((t) => t.id !== playingId));
      if (current) keepPlaying([current, ...rest], 0);
      else { musicQueueRef.current = rest; playMusicIndex(0); }
      return;
    }

    const merged = mergeQueue(musicQueueRef.current, playingIndex, trackItems);
    musicQueueRef.current = merged.queue;
    if (merged.queue[merged.index]?.id === playingId) {
      // A faixa atual continua na lista: segue tocando, só atualiza a posição
      keepPlaying(merged.queue, merged.index);
    } else if (merged.index >= merged.queue.length) {
      musicQueueRef.current = shuffle(merged.queue);
      playMusicIndex(0);
    } else {
      // A faixa atual foi removida: passa para a próxima da fila
      playMusicIndex(merged.index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracksKey, shuffleMusic]);

  // ========== Pedido do painel: "Testar locução agora" ==========
  const lastRequestSeqRef = useRef(announcementRequest?.seq);
  useEffect(() => {
    if (!announcementRequest || announcementRequest.seq === lastRequestSeqRef.current) return;
    lastRequestSeqRef.current = announcementRequest.seq;
    const started = startAnnouncementRef.current(announcementRequest.announcementId);
    if (!started) console.log("[AudioPlayer] Announcement request ignored (busy, empty or unknown id)");
  }, [announcementRequest]);

  useEffect(() => {
    const annItems: PlaylistItem[] = announcements.map((a) => ({
      id: a.id, name: a.name, filePath: a.url, type: "announcement",
    }));
    if (announcementQueueRef.current.length === 0) {
      announcementQueueRef.current = shuffle(annItems);
      announcementIndexRef.current = 0;
    } else {
      const merged = mergeQueue(announcementQueueRef.current, announcementIndexRef.current, annItems);
      announcementQueueRef.current = merged.queue;
      announcementIndexRef.current = merged.index;
    }
    if (annItems.length > 0) warmCache(announcementQueueRef.current[announcementIndexRef.current]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementsKey]);

  // ========== (b) Sync de volumes (sem reiniciar música) ==========
  useEffect(() => {
    musicVolumeRef.current = musicVolume;
    if (!duckEngagedRef.current) applyMusicVolume(musicVolume, VOLUME_RAMP_MS);
  }, [musicVolume, applyMusicVolume]);

  useEffect(() => {
    announcementVolumeRef.current = announcementVolume;
    applyAnnouncementVolume(announcementVolume, VOLUME_RAMP_MS);
  }, [announcementVolume, applyAnnouncementVolume]);

  useEffect(() => {
    musicDuckVolumeRef.current = musicDuckVolume;
    if (duckEngagedRef.current) applyMusicVolume(musicDuckVolume, VOLUME_RAMP_MS);
  }, [musicDuckVolume, applyMusicVolume]);

  // ========== (c) Intervalo — o relógio recalcula a partir da última locução ==========
  useEffect(() => {
    intervalRef.current = announcementIntervalMinutes;
  }, [announcementIntervalMinutes]);

  // ========== Cleanup ao desmontar ==========
  useEffect(() => {
    const nativeFadeFrames = nativeFadeFrameRef.current;
    const timers = announcementTimersRef;
    return () => {
      timers.current.forEach(clearTimeout);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      Object.values(nativeFadeFrames).forEach((frame) => {
        if (frame) cancelAnimationFrame(frame);
      });
    };
  }, []);

  // ========== Autoplay gesture recovery ==========
  useEffect(() => {
    if (!needsUserGesture) return;
    const resume = () => {
      const audio = musicRef.current;
      if (audio) {
        resumeAudioGraph();
        audio.muted = isMutedRef.current;
        syncMusicElementVolume(audio);
        audio.play()
          .then(() => setNeedsUserGesture(false))
          .catch(() => {});
      }
    };

    if (tvMode) {
      resume();
      const retryTimer = setInterval(resume, TV_RETRY_MS);
      const events = ["click", "pointerdown", "pointerup", "mousedown", "mouseup", "keydown", "keyup", "keypress", "touchstart", "touchend", "wheel"];
      events.forEach((ev) => {
        document.addEventListener(ev, resume, { capture: true, passive: true } as AddEventListenerOptions);
        window.addEventListener(ev, resume, { capture: true, passive: true } as AddEventListenerOptions);
      });
      return () => {
        clearInterval(retryTimer);
        events.forEach((ev) => {
          document.removeEventListener(ev, resume, { capture: true } as EventListenerOptions);
          window.removeEventListener(ev, resume, { capture: true } as EventListenerOptions);
        });
      };
    }

    // Tentativa 1: autoplay mudo → desmutar (funciona na maioria das Smart TVs)
    const tryMutedAutoplay = () => {
      const audio = musicRef.current;
      if (!audio) return;
      audio.muted = true;
      audio.play()
        .then(() => {
          // Sucesso tocando mudo — desmuta em seguida
          setTimeout(() => {
            if (!isMutedRef.current) audio.muted = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsUserGesture, tvMode, resumeAudioGraph]);


  // ========== Controles ==========
  const toggleMute = useCallback(() => {
    const m = musicRef.current; const a = announcementRef.current;
    const newMuted = !isMutedRef.current;
    isMutedRef.current = newMuted;
    if (m) m.muted = newMuted;
    if (a) a.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && tvMode && m) {
      syncMusicElementVolume(m);
      m.play().then(() => setNeedsUserGesture(false)).catch(() => setNeedsUserGesture(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tvMode]);

  const next = useCallback(() => playNextMusic(), [playNextMusic]);

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

  return (
    <>
      {/* Elementos sempre montados: a fila pode começar antes de qualquer re-render */}
      <audio ref={musicRef} onEnded={handleMusicEnded} onError={handleMusicError} onPlaying={handleMusicPlaying} preload="auto" autoPlay crossOrigin="anonymous" />
      {/* Sem autoPlay: a locução só toca depois que a música terminou de abaixar */}
      <audio ref={announcementRef} onEnded={handleAnnouncementEnded} onError={handleAnnouncementError} preload="auto" crossOrigin="anonymous" />

      {hasContent && !tvMode && needsUserGesture && (
        <div className="fixed bottom-4 left-4 z-50 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-xl text-white px-3 py-2 rounded-xl shadow-2xl border border-white/10 flex items-center gap-2">
            <VolumeX className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium opacity-90">Áudio sem som — pressione OK no controle</span>
          </div>
        </div>
      )}

      {tracks.length > 0 && (
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
      )}
    </>
  );
};
