import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MenuItem } from "./Dashboard";
import { AudioTrack, Announcement, SlideshowSettings, SlideshowTheme, WidgetPosition, DEFAULT_SLIDESHOW_SETTINGS, getCurrentDayOfWeek } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable, playlistTracksTable, slideshowSettingsTable } from "@/lib/supabase-helpers";
import { AudioPlayer } from "@/components/AudioPlayer";
import { InfoWidget } from "@/components/InfoWidget";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, Wifi, WifiOff } from "lucide-react";

const createDefaultSettings = (): SlideshowSettings => ({
  id: "default",
  ...DEFAULT_SLIDESHOW_SETTINGS,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const getThemeClasses = (theme: SlideshowTheme): string => {
  switch (theme) {
    case "light": return "bg-white";
    default: return "bg-black";
  }
};

const Slideshow = () => {
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist");

  const [allImages, setAllImages] = useState<MenuItem[]>([]);
  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SlideshowSettings>(createDefaultSettings());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Crossfade state: which layer (0 or 1) is in front
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  // Each layer holds an index into images[]
  const [layerContent, setLayerContent] = useState<[number, number]>([0, 0]);
  // Whether the next layer's image has finished loading
  const nextLoadedRef = useRef(false);
  const transitioningRef = useRef(false);

  const indexRef = useRef(currentIndex);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout>>();
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);

  // Filter images by current day of week
  useEffect(() => {
    const today = getCurrentDayOfWeek();
    const filtered = allImages.filter(img =>
      img.displayDays === null || img.displayDays === undefined || img.displayDays.length === 0 || img.displayDays.includes(today)
    );
    setImages(filtered);
    setCurrentIndex(prev => filtered.length > 0 ? prev % filtered.length : 0);
  }, [allImages]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await slideshowSettingsTable()
        .select("*").limit(1).maybeSingle();
      if (error) { console.error("[Slideshow] Settings error:", error); return; }
      if (data) {
        const row = data as any;
        setSettings({
          id: row.id,
          theme: row.theme as SlideshowTheme,
          showClock: row.show_clock, showDate: row.show_date,
          showWeather: row.show_weather,
          weatherLocation: row.weather_location || "São Paulo",
          weatherLat: parseFloat(row.weather_lat) || -23.5505,
          weatherLon: parseFloat(row.weather_lon) || -46.6333,
          showLogo: row.show_logo, logoUrl: row.logo_url,
          logoPosition: (row.logo_position || "top-left") as WidgetPosition,
          customMessage: row.custom_message,
          customMessagePosition: (row.custom_message_position || "bottom-center") as WidgetPosition,
          createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
        });
      }
    } catch (error) { console.error("[Slideshow] Settings error:", error); }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const imagesRes = await menuItemsTable()
        .select("*").order("order_index", { ascending: true });

      if (imagesRes.data) {
        const formatted = imagesRes.data.map((img: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from("menu-images").getPublicUrl(img.file_path);
          return {
            id: img.id, url: publicUrl, name: img.name,
            order: img.order_index, uploadedAt: new Date(img.created_at),
            displayTime: img.display_time || 10,
            transitionType: img.transition_type || "fade",
            itemType: img.item_type || "image",
            videoAutoplay: img.video_autoplay !== false,
            videoMuted: img.video_muted !== false,
            videoLoop: img.video_loop || false,
            displayDays: img.display_days || null,
          };
        });
        setAllImages(formatted);
      }

      let audioIds: string[] | null = null;
      if (playlistId) {
        const { data: pt } = await playlistTracksTable()
          .select("audio_track_id").eq("playlist_id", playlistId)
          .order("order_index", { ascending: true });
        if (pt && pt.length > 0) audioIds = pt.map((t: any) => t.audio_track_id);
      }

      let audiosQuery = audioTracksTable().select("*").order("order_index", { ascending: true });
      if (audioIds) audiosQuery = audiosQuery.in("id", audioIds);
      const audiosRes = await audiosQuery;

      if (audiosRes.data) {
        let audioData = audiosRes.data;
        if (audioIds) {
          audioData = audioIds.map((id) => audiosRes.data.find((a: any) => a.id === id)).filter(Boolean);
        }
        setAudios(audioData.map((a: any) => ({
          id: a.id, url: a.file_path, name: a.name,
          order: a.order_index, uploadedAt: new Date(a.created_at),
        })));
      }

      const announcementsRes = await announcementsTable()
        .select("*").order("order_index", { ascending: true });
      if (announcementsRes.data) {
        setAnnouncements(announcementsRes.data.map((a: any) => ({
          id: a.id, url: a.file_path, name: a.name,
          order: a.order_index, uploadedAt: new Date(a.created_at),
        })));
      }

      await loadSettings();
    } catch (e) { console.error("[Slideshow] Load error:", e); }
  }, [playlistId, loadSettings]);

  useEffect(() => { loadData(); }, [loadData]);

  // Preload next few images in background
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;

    const preload = () => {
      for (let i = 1; i <= Math.min(3, images.length - 1); i++) {
        if (cancelled) return;
        const idx = (currentIndex + i) % images.length;
        const item = images[idx];
        if (item.itemType === "video") continue;
        const img = new Image();
        img.src = item.url;
      }
    };

    const timer = setTimeout(preload, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [images, currentIndex]);

  // Advance to a specific index with crossfade
  const advanceTo = useCallback((nextIdx: number) => {
    if (images.length === 0 || transitioningRef.current) return;
    
    const nextLayer: 0 | 1 = activeLayer === 0 ? 1 : 0;
    
    // Put the next image on the hidden layer
    setLayerContent(prev => {
      const updated = [...prev] as [number, number];
      updated[nextLayer] = nextIdx;
      return updated;
    });
    
    setCurrentIndex(nextIdx);
    nextLoadedRef.current = false;
    transitioningRef.current = true;

    const item = images[nextIdx];
    
    if (item?.itemType === "video") {
      // Videos: swap immediately
      setTimeout(() => {
        setActiveLayer(nextLayer);
        transitioningRef.current = false;
      }, 50);
      return;
    }

    // For images: the onLoad handler on the hidden layer will trigger the swap
    // Set a fallback timer in case the image fails to fire onLoad
    clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      if (transitioningRef.current) {
        console.warn("[Slideshow] Fallback: forcing transition after timeout");
        setActiveLayer(nextLayer);
        transitioningRef.current = false;
      }
    }, 8000);
  }, [images, activeLayer]);

  // Called when the hidden layer's image loads
  const handleNextImageLoaded = useCallback(() => {
    if (!transitioningRef.current) return;
    clearTimeout(fallbackTimerRef.current);
    nextLoadedRef.current = true;
    
    // Swap layers - the CSS transition handles the fade
    setActiveLayer(prev => prev === 0 ? 1 : 0);
    
    // After the CSS transition completes, mark as done
    setTimeout(() => {
      transitioningRef.current = false;
    }, 750);
  }, []);

  // Handle image load error on hidden layer
  const handleNextImageError = useCallback(() => {
    if (!transitioningRef.current) return;
    clearTimeout(fallbackTimerRef.current);
    console.warn("[Slideshow] Image failed to load, skipping");
    transitioningRef.current = false;
    
    // Skip to the next one
    const nextIdx = (indexRef.current + 1) % images.length;
    setTimeout(() => advanceTo(nextIdx), 500);
  }, [images.length, advanceTo]);

  // Initialize layers when images first load
  useEffect(() => {
    if (images.length > 0) {
      setLayerContent([currentIndex, currentIndex]);
      setActiveLayer(0);
      transitioningRef.current = false;
    }
    // Only run on images change, not currentIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    
    const current = images[currentIndex];
    const time = (current?.displayTime || 10) * 1000;
    
    autoAdvanceRef.current = setTimeout(() => {
      const nextIdx = (indexRef.current + 1) % images.length;
      advanceTo(nextIdx);
    }, time);
    
    return () => clearTimeout(autoAdvanceRef.current);
  }, [isPlaying, images, currentIndex, advanceTo]);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [isReloading, setIsReloading] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Trigger full page reload with safety throttle
  const triggerFullReload = useCallback(() => {
    clearTimeout(reloadDebounceRef.current);
    reloadDebounceRef.current = setTimeout(() => {
      const RELOAD_KEY = "slideshow_last_reload";
      const MIN_GAP_MS = 5000;
      const last = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);
      const now = Date.now();
      if (now - last < MIN_GAP_MS) {
        console.log("[Slideshow] Reload skipped (throttled), reloading data instead");
        loadData();
        return;
      }
      console.log("[Slideshow] Realtime change detected, reloading page...");
      sessionStorage.setItem(RELOAD_KEY, String(now));
      setIsReloading(true);
      setTimeout(() => window.location.reload(), 400);
    }, 2000);
  }, [loadData]);

  // Real-time updates with auto-reconnect
  useEffect(() => {
    let channel = supabase
      .channel("slideshow-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, triggerFullReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "audio_tracks" }, triggerFullReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, triggerFullReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_tracks" }, triggerFullReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_settings" }, () => {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = setTimeout(loadSettings, 500);
      });

    const subscribe = () => {
      channel.subscribe((status) => {
        console.log("[Slideshow] Realtime status:", status);
        if (status === "SUBSCRIBED") {
          setConnectionStatus('connected');
          if (reconnectAttemptsRef.current > 0) loadData();
          reconnectAttemptsRef.current = 0;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus('reconnecting');
          const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(() => {
            supabase.removeChannel(channel);
            channel = supabase
              .channel("slideshow-updates-" + Date.now())
              .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, triggerFullReload)
              .on("postgres_changes", { event: "*", schema: "public", table: "audio_tracks" }, triggerFullReload)
              .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, triggerFullReload)
              .on("postgres_changes", { event: "*", schema: "public", table: "playlist_tracks" }, triggerFullReload)
              .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_settings" }, () => {
                clearTimeout(reloadDebounceRef.current);
                reloadDebounceRef.current = setTimeout(loadSettings, 500);
              });
            subscribe();
          }, delay);
        } else if (status === "CLOSED") {
          setConnectionStatus('disconnected');
        }
      });
    };

    subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(reloadDebounceRef.current);
      clearTimeout(reconnectTimerRef.current);
    };
  }, [loadSettings, triggerFullReload]);

  // Mouse controls
  useEffect(() => {
    const handleMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => { window.removeEventListener("mousemove", handleMove); clearTimeout(controlsTimeoutRef.current); };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight": case " ":
          e.preventDefault();
          advanceTo((indexRef.current + 1) % images.length);
          break;
        case "ArrowLeft":
          e.preventDefault();
          advanceTo((indexRef.current - 1 + images.length) % images.length);
          break;
        case "p": case "P":
          e.preventDefault(); setIsPlaying(p => !p); break;
        case "r": case "R":
          e.preventDefault(); loadData(); break;
        case "Escape":
          setShowControls(s => !s); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [images.length, loadData, advanceTo]);

  // Empty state
  if (images.length === 0) {
    return (
      <div className={`min-h-screen ${getThemeClasses(settings.theme)} flex items-center justify-center`}>
        <div className={`text-center ${settings.theme === "light" ? "text-gray-900" : "text-white"}`}>
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-4xl font-bold mb-4">Menu Board Digital</h1>
          <p className="text-xl opacity-75">Nenhuma imagem para hoje.</p>
          <p className="text-sm opacity-50 mt-2">Dia atual: {getCurrentDayOfWeek()}</p>
        </div>
      </div>
    );
  }

  const current = images[currentIndex];

  const renderLayerMedia = (layerIdx: 0 | 1, isActive: boolean) => {
    const imgIndex = layerContent[layerIdx];
    const item = images[imgIndex];
    if (!item) return null;

    if (item.itemType === "video") {
      return (
        <video
          key={`video-${item.id}`}
          src={item.url}
          className="w-full h-full object-cover"
          autoPlay muted loop={item.videoLoop} playsInline
        />
      );
    }

    return (
      <img
        key={`img-${layerIdx}-${item.id}`}
        src={item.url}
        alt={item.name}
        className="w-full h-full object-cover"
        loading="eager"
        decoding="async"
        onLoad={!isActive ? handleNextImageLoaded : undefined}
        onError={!isActive ? handleNextImageError : undefined}
      />
    );
  };

  return (
    <div className={`min-h-screen ${getThemeClasses(settings.theme)} relative overflow-hidden`}>
      <AudioPlayer tracks={audios} announcements={announcements} />
      <InfoWidget settings={settings} />

      {/* Two-layer crossfade */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: activeLayer === 0 ? 1 : 0, zIndex: activeLayer === 0 ? 2 : 1 }}
        >
          {renderLayerMedia(0, activeLayer === 0)}
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: activeLayer === 1 ? 1 : 0, zIndex: activeLayer === 1 ? 2 : 1 }}
        >
          {renderLayerMedia(1, activeLayer === 1)}
        </div>
      </div>

      {/* Controls */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button
          onClick={() => advanceTo((currentIndex - 1 + images.length) % images.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => advanceTo((currentIndex + 1) % images.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-8 right-8 flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
            connectionStatus === 'reconnecting' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {connectionStatus === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'reconnecting' ? 'Reconectando...' : 'Offline'}
          </div>
          <button onClick={loadData} className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70">
            <RefreshCw className="h-6 w-6" />
          </button>
          <button onClick={() => setIsPlaying(p => !p)} className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70">
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>

        <div className="absolute bottom-8 left-8 text-white">
          <div className="bg-black/50 px-4 py-3 rounded-lg">
            <p className="text-lg font-medium">{current.name}</p>
            <p className="text-sm opacity-75">{currentIndex + 1} de {images.length}</p>
          </div>
        </div>

        {images.length <= 15 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => advanceTo(i)}
                className={`w-3 h-3 rounded-full ${i === currentIndex ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Slideshow;
