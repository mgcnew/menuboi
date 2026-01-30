import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MenuItem } from "./Dashboard";
import { AudioTrack, Announcement, SlideshowSettings, SlideshowTheme, WidgetPosition, DEFAULT_SLIDESHOW_SETTINGS } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable, playlistTracksTable, slideshowSettingsTable } from "@/lib/supabase-helpers";
import { AudioPlayer } from "@/components/AudioPlayer";
import { InfoWidget } from "@/components/InfoWidget";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, Loader2 } from "lucide-react";

// Minimal image state management
type ImageState = {
  loaded: Set<string>;
  failed: Set<string>;
  loading: Set<string>;
};

type ImageAction =
  | { type: "LOADING"; url: string }
  | { type: "LOADED"; url: string }
  | { type: "FAILED"; url: string }
  | { type: "RESET" };

function imageReducer(state: ImageState, action: ImageAction): ImageState {
  switch (action.type) {
    case "LOADING":
      if (state.loading.has(action.url)) return state;
      return { ...state, loading: new Set(state.loading).add(action.url) };
    case "LOADED": {
      if (state.loaded.has(action.url)) return state;
      const newLoading = new Set(state.loading);
      newLoading.delete(action.url);
      return { 
        ...state, 
        loaded: new Set(state.loaded).add(action.url),
        loading: newLoading
      };
    }
    case "FAILED": {
      if (state.failed.has(action.url)) return state;
      const newLoading = new Set(state.loading);
      newLoading.delete(action.url);
      return { 
        ...state, 
        failed: new Set(state.failed).add(action.url),
        loading: newLoading
      };
    }
    case "RESET":
      return { loaded: new Set(), failed: new Set(), loading: new Set() };
    default:
      return state;
  }
}

// Preload image utility with timeout
const preloadImage = (url: string, timeout = 10000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(); // Resolve anyway after timeout - image might still work
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject();
    };
    img.src = url;
  });
};

// Default settings for fallback
const createDefaultSettings = (): SlideshowSettings => ({
  id: "default",
  ...DEFAULT_SLIDESHOW_SETTINGS,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Get theme classes for the slideshow container
const getThemeClasses = (theme: SlideshowTheme): string => {
  switch (theme) {
    case "light":
      return "bg-white";
    case "minimal":
      return "bg-black";
    case "branded":
      return "bg-black";
    case "dark":
    default:
      return "bg-black";
  }
};

const Slideshow = () => {
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist");

  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [settings, setSettings] = useState<SlideshowSettings>(createDefaultSettings());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  const [imageState, dispatch] = useReducer(imageReducer, {
    loaded: new Set<string>(),
    failed: new Set<string>(),
    loading: new Set<string>(),
  });

  const indexRef = useRef(currentIndex);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const reloadDebounceRef = useRef<NodeJS.Timeout>();
  const forceShowTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync ref
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Force show after timeout - fallback for TV devices
  useEffect(() => {
    if (images.length === 0) return;
    
    const current = images[currentIndex];
    if (current.itemType === "video") return;
    
    // Reset force show on index change
    setForceShow(false);
    
    // If not loaded after 3 seconds, force show
    forceShowTimeoutRef.current = setTimeout(() => {
      if (!imageState.loaded.has(current.url)) {
        console.log("[Slideshow] Force showing image after timeout:", current.name);
        setForceShow(true);
      }
    }, 3000);
    
    return () => clearTimeout(forceShowTimeoutRef.current);
  }, [currentIndex, images, imageState.loaded]);

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await slideshowSettingsTable()
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[Slideshow] Settings load error:", error);
        return;
      }

      if (data) {
        const row = data as any;
        setSettings({
          id: row.id,
          theme: row.theme as SlideshowTheme,
          showClock: row.show_clock,
          showDate: row.show_date,
          showWeather: row.show_weather,
          weatherLocation: row.weather_location || "São Paulo",
          weatherLat: parseFloat(row.weather_lat) || -23.5505,
          weatherLon: parseFloat(row.weather_lon) || -46.6333,
          showLogo: row.show_logo,
          logoUrl: row.logo_url,
          logoPosition: (row.logo_position || "top-left") as WidgetPosition,
          customMessage: row.custom_message,
          customMessagePosition: (row.custom_message_position || "bottom-center") as WidgetPosition,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        });
      }
    } catch (error) {
      console.error("[Slideshow] Settings load error:", error);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      // Load images
      const imagesRes = await menuItemsTable()
        .select("*")
        .order("order_index", { ascending: true });

      if (imagesRes.data) {
        const formatted = imagesRes.data.map((img: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from("menu-images")
            .getPublicUrl(img.file_path);
          return {
            id: img.id,
            url: publicUrl,
            name: img.name,
            order: img.order_index,
            uploadedAt: new Date(img.created_at),
            displayTime: img.display_time || 10,
            transitionType: img.transition_type || "fade",
            itemType: img.item_type || "image",
            videoAutoplay: img.video_autoplay !== false,
            videoMuted: img.video_muted !== false,
            videoLoop: img.video_loop || false,
          };
        });
        setImages(formatted);
        dispatch({ type: "RESET" });
      }

      // Load audios - filtered by playlist if specified
      let audioIds: string[] | null = null;
      
      if (playlistId) {
        const { data: playlistTracks } = await playlistTracksTable()
          .select("audio_track_id")
          .eq("playlist_id", playlistId)
          .order("order_index", { ascending: true });
        
        if (playlistTracks && playlistTracks.length > 0) {
          audioIds = playlistTracks.map((t: any) => t.audio_track_id);
        }
      }

      let audiosQuery = audioTracksTable()
        .select("*")
        .order("order_index", { ascending: true });

      if (audioIds) {
        audiosQuery = audiosQuery.in("id", audioIds);
      }

      const audiosRes = await audiosQuery;

      if (audiosRes.data) {
        // If playlist, maintain playlist order
        let audioData = audiosRes.data;
        if (audioIds) {
          audioData = audioIds
            .map((id) => audiosRes.data.find((a: any) => a.id === id))
            .filter(Boolean);
        }

        setAudios(
          audioData.map((a: any) => ({
            id: a.id,
            url: a.file_path,
            name: a.name,
            order: a.order_index,
            uploadedAt: new Date(a.created_at),
          }))
        );
      }

      // Load announcements
      const announcementsRes = await announcementsTable()
        .select("*")
        .order("order_index", { ascending: true });

      if (announcementsRes.data) {
        setAnnouncements(
          announcementsRes.data.map((a: any) => ({
            id: a.id,
            url: a.file_path,
            name: a.name,
            order: a.order_index,
            uploadedAt: new Date(a.created_at),
          }))
        );
      }

      // Load settings
      await loadSettings();
    } catch (e) {
      console.error("[Slideshow] Load error:", e);
    }
  }, [playlistId, loadSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preload current + next 3 images (more aggressive for TV)
  useEffect(() => {
    if (images.length === 0) return;

    const preloadNext = async () => {
      for (let i = 0; i < Math.min(3, images.length); i++) {
        const idx = (currentIndex + i) % images.length;
        const img = images[idx];
        if (img.itemType === "video" || imageState.loaded.has(img.url) || imageState.failed.has(img.url) || imageState.loading.has(img.url)) {
          continue;
        }
        
        dispatch({ type: "LOADING", url: img.url });
        
        try {
          await preloadImage(img.url, 10000);
          dispatch({ type: "LOADED", url: img.url });
          console.log("[Slideshow] Preloaded:", img.name);
        } catch {
          dispatch({ type: "FAILED", url: img.url });
          console.warn("[Slideshow] Failed to preload:", img.name);
        }
      }
    };

    preloadNext();
  }, [images, currentIndex, imageState.loaded, imageState.failed, imageState.loading]);

  // Auto-advance with stable timer
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const advance = () => {
      const current = images[indexRef.current];
      const time = (current?.displayTime || 10) * 1000;

      return setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, time);
    };

    let timer = advance();

    return () => clearTimeout(timer);
  }, [isPlaying, images, currentIndex]);

  // Real-time updates with debounce
  useEffect(() => {
    const channel = supabase
      .channel("slideshow-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = setTimeout(loadData, 2000);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_settings" }, () => {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = setTimeout(loadSettings, 500);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(reloadDebounceRef.current);
    };
  }, [loadData, loadSettings]);

  // Mouse controls
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

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          setCurrentIndex((prev) => (prev + 1) % images.length);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
          break;
        case "p":
        case "P":
          e.preventDefault();
          setIsPlaying((p) => !p);
          break;
        case "r":
        case "R":
          e.preventDefault();
          loadData();
          break;
        case "Escape":
          setShowControls((s) => !s);
          break;
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
          <p className="text-xl opacity-75">Nenhuma imagem encontrada.</p>
        </div>
      </div>
    );
  }

  const current = images[currentIndex];
  const isLoaded = imageState.loaded.has(current.url);
  const isLoading = imageState.loading.has(current.url);
  const hasFailed = imageState.failed.has(current.url);
  
  // Show image if: loaded, forced after timeout, or not yet tried
  const shouldShowImage = isLoaded || forceShow || (!isLoading && !hasFailed);

  return (
    <div className={`min-h-screen ${getThemeClasses(settings.theme)} relative overflow-hidden`}>
      {/* Audio Player */}
      <AudioPlayer tracks={audios} announcements={announcements} />

      {/* Info Widget - renders clock, date, weather, logo, custom message */}
      <InfoWidget settings={settings} />

      {/* Current Image/Video */}
      <div className="absolute inset-0">
        {hasFailed && !forceShow ? (
          <div className={`w-full h-full flex items-center justify-center ${settings.theme === "light" ? "text-gray-900" : "text-white"}`}>
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p>Erro ao carregar</p>
              <p className="text-sm opacity-50 mt-2">{current.name}</p>
            </div>
          </div>
        ) : current.itemType === "video" ? (
          <video
            key={current.id}
            src={current.url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop={current.videoLoop}
            playsInline
          />
        ) : (
          <>
            {/* Loading indicator - show while loading and not forced */}
            {isLoading && !forceShow && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Loader2 className={`h-16 w-16 ${settings.theme === "light" ? "text-gray-900" : "text-white"} animate-spin`} />
              </div>
            )}
            
            {/* Image - always render, control visibility */}
            <img
              key={current.id}
              src={current.url}
              alt={current.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                shouldShowImage ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => {
                dispatch({ type: "LOADED", url: current.url });
                console.log("[Slideshow] Image loaded:", current.name);
              }}
              onError={() => {
                dispatch({ type: "FAILED", url: current.url });
                console.error("[Slideshow] Image failed:", current.name);
              }}
            />
          </>
        )}
      </div>

      {/* Controls */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Nav buttons */}
        <button
          onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full hover:bg-black/70"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Bottom controls */}
        <div className="absolute bottom-8 right-8 flex gap-3">
          <button
            onClick={loadData}
            className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70"
          >
            <RefreshCw className="h-6 w-6" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="bg-black/50 text-white p-4 rounded-full hover:bg-black/70"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>

        {/* Info */}
        <div className="absolute bottom-8 left-8 text-white">
          <div className="bg-black/50 px-4 py-3 rounded-lg">
            <p className="text-lg font-medium">{current.name}</p>
            <p className="text-sm opacity-75">
              {currentIndex + 1} de {images.length}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {images.length <= 15 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full ${
                  i === currentIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Slideshow;