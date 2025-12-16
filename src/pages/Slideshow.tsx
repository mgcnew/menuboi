import { useState, useEffect, useCallback, useReducer, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MenuItem } from "./Dashboard";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable, playlistTracksTable } from "@/lib/supabase-helpers";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw } from "lucide-react";

// Minimal image state management
type ImageState = {
  loaded: Set<string>;
  failed: Set<string>;
};

type ImageAction =
  | { type: "LOADED"; url: string }
  | { type: "FAILED"; url: string }
  | { type: "RESET" };

function imageReducer(state: ImageState, action: ImageAction): ImageState {
  switch (action.type) {
    case "LOADED":
      if (state.loaded.has(action.url)) return state;
      return { ...state, loaded: new Set(state.loaded).add(action.url) };
    case "FAILED":
      if (state.failed.has(action.url)) return state;
      return { ...state, failed: new Set(state.failed).add(action.url) };
    case "RESET":
      return { loaded: new Set(), failed: new Set() };
    default:
      return state;
  }
}

// Preload image utility
const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = url;
  });
};

const Slideshow = () => {
  const [searchParams] = useSearchParams();
  const playlistId = searchParams.get("playlist");

  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const [imageState, dispatch] = useReducer(imageReducer, {
    loaded: new Set<string>(),
    failed: new Set<string>(),
  });

  const indexRef = useRef(currentIndex);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const reloadDebounceRef = useRef<NodeJS.Timeout>();

  // Sync ref
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

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
    } catch (e) {
      // Silent for TV
    }
  }, [playlistId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Preload current + next image
  useEffect(() => {
    if (images.length === 0) return;

    const preloadNext = async () => {
      for (let i = 0; i < Math.min(2, images.length); i++) {
        const idx = (currentIndex + i) % images.length;
        const img = images[idx];
        if (img.itemType === "video" || imageState.loaded.has(img.url) || imageState.failed.has(img.url)) {
          continue;
        }
        try {
          await preloadImage(img.url);
          dispatch({ type: "LOADED", url: img.url });
        } catch {
          dispatch({ type: "FAILED", url: img.url });
        }
      }
    };

    preloadNext();
  }, [images, currentIndex, imageState.loaded, imageState.failed]);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(reloadDebounceRef.current);
    };
  }, [loadData]);

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-4xl font-bold mb-4">Menu Board Digital</h1>
          <p className="text-xl opacity-75">Nenhuma imagem encontrada.</p>
        </div>
      </div>
    );
  }

  const current = images[currentIndex];
  const isLoaded = imageState.loaded.has(current.url);
  const hasFailed = imageState.failed.has(current.url);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Audio Player */}
      <AudioPlayer tracks={audios} announcements={announcements} />

      {/* Current Image/Video */}
      <div className="absolute inset-0">
        {hasFailed ? (
          <div className="w-full h-full flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p>Erro ao carregar</p>
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
          <img
            key={current.id}
            src={current.url}
            alt={current.name}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => dispatch({ type: "LOADED", url: current.url })}
            onError={() => dispatch({ type: "FAILED", url: current.url })}
          />
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
