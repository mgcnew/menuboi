import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MenuItem } from "./Dashboard";
import { AudioTrack, Announcement, SlideshowSettings, SlideshowTheme, WidgetPosition, DEFAULT_SLIDESHOW_SETTINGS, getCurrentDayOfWeek } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable, playlistTracksTable, slideshowSettingsTable } from "@/lib/supabase-helpers";
import { AudioPlayer } from "@/components/AudioPlayer";
import { InfoWidget } from "@/components/InfoWidget";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";

// Preload image utility with timeout
const preloadImage = (url: string, timeout = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve();
    }, timeout);
    img.onload = () => { clearTimeout(timer); resolve(); };
    img.onerror = () => { clearTimeout(timer); reject(); };
    img.src = url;
  });
};

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

  // Dual-buffer state: which buffer (0 or 1) is active
  const [activeBuffer, setActiveBuffer] = useState(0);
  const [bufferReady, setBufReady] = useState([false, false]);

  // Persistent image cache ref - never cleared between reloads
  const imageCache = useRef(new Set<string>());
  const failedImages = useRef(new Set<string>());

  const indexRef = useRef(currentIndex);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);

  // Filter images by current day of week
  useEffect(() => {
    const today = getCurrentDayOfWeek();
    const filtered = allImages.filter(img =>
      img.displayDays === null || img.displayDays === undefined || img.displayDays.length === 0 || img.displayDays.includes(today)
    );
    setImages(filtered);
    // Reset index if it's out of bounds
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

      // Load audios
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

      // Load announcements
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

  // Preload next 4 images aggressively in background
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;

    const preloadAhead = async () => {
      for (let i = 0; i < Math.min(4, images.length); i++) {
        if (cancelled) return;
        const idx = (currentIndex + i) % images.length;
        const img = images[idx];
        if (img.itemType === "video") continue;
        if (imageCache.current.has(img.url) || failedImages.current.has(img.url)) continue;

        try {
          await preloadImage(img.url, 10000);
          imageCache.current.add(img.url);
        } catch {
          failedImages.current.add(img.url);
        }
      }
    };

    const timer = setTimeout(preloadAhead, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [images, currentIndex]);

  // When currentIndex changes, set up dual buffers
  useEffect(() => {
    if (images.length === 0) return;
    const current = images[currentIndex];
    
    // Current buffer is always "ready" - show immediately even if loading
    if (current.itemType === "video" || imageCache.current.has(current.url)) {
      setBufReady(prev => {
        const next = [...prev];
        next[activeBuffer] = true;
        return next;
      });
    }
  }, [currentIndex, images, activeBuffer]);

  // Auto-advance with dual-buffer swap
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    const current = images[indexRef.current];
    const time = (current?.displayTime || 10) * 1000;
    const timer = setTimeout(() => {
      // Swap buffers
      setActiveBuffer(prev => prev === 0 ? 1 : 0);
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, time);
    return () => clearTimeout(timer);
  }, [isPlaying, images, currentIndex]);

  // Real-time updates - listen to ALL content tables
  useEffect(() => {
    const debouncedReload = () => {
      clearTimeout(reloadDebounceRef.current);
      reloadDebounceRef.current = setTimeout(() => {
        console.log("[Slideshow] Realtime change detected, reloading...");
        loadData();
      }, 2000);
    };

    const channel = supabase
      .channel("slideshow-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, debouncedReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "audio_tracks" }, debouncedReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, debouncedReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "playlist_tracks" }, debouncedReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_settings" }, () => {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = setTimeout(loadSettings, 500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); clearTimeout(reloadDebounceRef.current); };
  }, [loadData, loadSettings]);

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
          setActiveBuffer(prev => prev === 0 ? 1 : 0);
          setCurrentIndex(p => (p + 1) % images.length);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setActiveBuffer(prev => prev === 0 ? 1 : 0);
          setCurrentIndex(p => (p - 1 + images.length) % images.length);
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
  }, [images.length, loadData]);

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
  const nextIndex = (currentIndex + 1) % images.length;
  const nextImage = images[nextIndex];

  const renderMedia = (item: MenuItem, isNext: boolean) => {
    if (item.itemType === "video") {
      return (
        <video
          key={item.id}
          src={item.url}
          className="w-full h-full object-cover"
          autoPlay muted loop={item.videoLoop} playsInline
        />
      );
    }
    return (
      <img
        key={item.id + (isNext ? '-next' : '')}
        src={item.url}
        alt={item.name}
        className="w-full h-full object-cover"
        loading="eager"
        decoding="async"
        onLoad={() => { imageCache.current.add(item.url); }}
        onError={() => {
          failedImages.current.add(item.url);
          if (!isNext) {
            setTimeout(() => {
              if (indexRef.current === currentIndex) {
                setActiveBuffer(prev => prev === 0 ? 1 : 0);
                setCurrentIndex(p => (p + 1) % images.length);
              }
            }, 2000);
          }
        }}
      />
    );
  };

  return (
    <div className={`min-h-screen ${getThemeClasses(settings.theme)} relative overflow-hidden`}>
      <AudioPlayer tracks={audios} announcements={announcements} />
      <InfoWidget settings={settings} />

      {/* Dual-buffer rendering: two layers, one visible, one preloading */}
      <div className="absolute inset-0">
        {/* Buffer 0 */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: activeBuffer === 0 ? 1 : 0, zIndex: activeBuffer === 0 ? 2 : 1 }}
        >
          {renderMedia(current, false)}
        </div>
        {/* Buffer 1 - preloads next image */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: activeBuffer === 1 ? 1 : 0, zIndex: activeBuffer === 1 ? 2 : 1 }}
        >
          {activeBuffer === 1 ? renderMedia(current, false) : renderMedia(nextImage, true)}
        </div>
      </div>

      {/* Controls */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button
          onClick={() => { setActiveBuffer(p => p === 0 ? 1 : 0); setCurrentIndex(p => (p - 1 + images.length) % images.length); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => { setActiveBuffer(p => p === 0 ? 1 : 0); setCurrentIndex(p => (p + 1) % images.length); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-8 right-8 flex gap-3">
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
                onClick={() => { setActiveBuffer(p => p === 0 ? 1 : 0); setCurrentIndex(i); }}
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
