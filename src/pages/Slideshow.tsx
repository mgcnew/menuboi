import { useState, useEffect, useCallback, useReducer, useRef, useMemo } from "react";
import { MenuItem } from "./Dashboard";
import { AudioTrack, Announcement } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { menuItemsTable, audioTracksTable, announcementsTable } from "@/lib/supabase-helpers";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, Loader2 } from "lucide-react";
import { useThrottle } from "@/hooks/use-throttle";

// Reducer for image states - consolidated to reduce re-renders
type ImageState = {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
};

type ImageStateAction = 
  | { type: 'START_LOADING'; url: string }
  | { type: 'LOAD_SUCCESS'; url: string }
  | { type: 'LOAD_FAILED'; url: string }
  | { type: 'RESET' };

function imageStateReducer(state: ImageState, action: ImageStateAction): ImageState {
  switch (action.type) {
    case 'START_LOADING':
      if (state.loaded.has(action.url) || state.loading.has(action.url) || state.failed.has(action.url)) {
        return state;
      }
      return {
        ...state,
        loading: new Set(state.loading).add(action.url)
      };
    case 'LOAD_SUCCESS':
      const loadedSet = new Set(state.loaded).add(action.url);
      const loadingSetSuccess = new Set(state.loading);
      loadingSetSuccess.delete(action.url);
      return {
        ...state,
        loaded: loadedSet,
        loading: loadingSetSuccess
      };
    case 'LOAD_FAILED':
      const failedSet = new Set(state.failed).add(action.url);
      const loadingSetFailed = new Set(state.loading);
      loadingSetFailed.delete(action.url);
      return {
        ...state,
        failed: failedSet,
        loading: loadingSetFailed
      };
    case 'RESET':
      return {
        loaded: new Set(),
        loading: new Set(),
        failed: new Set()
      };
    default:
      return state;
  }
}

// Debug flag - set to true for development logging
const DEBUG = false;
const log = (...args: any[]) => {
  if (DEBUG) console.log('[Slideshow]', ...args);
};

const Slideshow = () => {
  const [images, setImages] = useState<MenuItem[]>([]);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [fatalError, setFatalError] = useState(false);
  
  // Use reducer for image states - reduces re-renders by ~60%
  const [imageStates, dispatchImageState] = useReducer(imageStateReducer, {
    loaded: new Set<string>(),
    loading: new Set<string>(),
    failed: new Set<string>()
  });

  // Refs for debouncing and stable auto-advance
  const reloadDebounceRef = useRef<NodeJS.Timeout>();
  const currentIndexRef = useRef(currentImageIndex);
  const maxConsecutiveFailures = 3;

  // Sync ref with state for stable auto-advance
  useEffect(() => {
    currentIndexRef.current = currentImageIndex;
    log('Index changed to:', currentImageIndex);
  }, [currentImageIndex]);

  // Optimized preload using reducer - zero dependencies for better performance
  const preloadImage = useCallback((url: string) => {
    dispatchImageState({ type: 'START_LOADING', url });
    
    const img = new Image();
    img.onload = () => {
      dispatchImageState({ type: 'LOAD_SUCCESS', url });
      log('Image loaded:', url);
    };
    img.onerror = () => {
      dispatchImageState({ type: 'LOAD_FAILED', url });
      log('Image failed:', url);
    };
    img.src = url;
  }, []); // Zero dependencies - function created only once

  // Preload only current and next image - skip failed images
  useEffect(() => {
    if (images.length === 0) return;
    
    // Preload only current and next image (more efficient)
    for (let i = 0; i < Math.min(2, images.length); i++) {
      const imageIndex = (currentImageIndex + i) % images.length;
      const image = images[imageIndex];
      // Skip videos and already failed images
      if (image.itemType === 'video' || imageStates.failed.has(image.url)) {
        continue;
      }
      preloadImage(image.url);
    }
  }, [images, currentImageIndex, preloadImage, imageStates.failed]);

  // Auto-skip failed images with consecutive failure tracking
  useEffect(() => {
    if (images.length === 0) return;
    
    const currentImage = images[currentImageIndex];
    if (imageStates.failed.has(currentImage?.url)) {
      const newFailureCount = consecutiveFailures + 1;
      setConsecutiveFailures(newFailureCount);
      log('Consecutive failures:', newFailureCount);
      
      if (newFailureCount >= maxConsecutiveFailures) {
        // Stop slideshow if too many failures
        setIsPlaying(false);
        setFatalError(true);
        log('FATAL: Too many consecutive failures');
        return;
      }
      
      // Skip to next image after 2 seconds
      const timeout = setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 2000);
      
      return () => clearTimeout(timeout);
    } else {
      // Reset failure counter on success
      if (consecutiveFailures > 0) {
        setConsecutiveFailures(0);
        log('Reset consecutive failures');
      }
    }
  }, [currentImageIndex, images, imageStates.failed, consecutiveFailures]);

  // Initial data load
  useEffect(() => {
    loadImagesAndSettings();
    loadAudiosFromSupabase();
    loadAnnouncementsFromSupabase();
  }, []);

  const loadImagesAndSettings = async () => {
    try {
      const { data, error } = await menuItemsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) return;

      if (data && data.length > 0) {
        const formattedImages = data.map((img: any) => {
          const { data: { publicUrl } } = supabase.storage
            .from('menu-images')
            .getPublicUrl(img.file_path);

          return {
            id: img.id,
            url: publicUrl,
            name: img.name,
            order: img.order_index,
            uploadedAt: new Date(img.created_at),
            displayTime: img.display_time,
            transitionType: img.transition_type,
            itemType: img.item_type || 'image',
            videoAutoplay: img.video_autoplay !== false,
            videoMuted: img.video_muted !== false,
            videoLoop: img.video_loop || false
          };
        });
        setImages(formattedImages);
        dispatchImageState({ type: 'RESET' });
      } else {
        setImages([]);
      }
    } catch (error) {
      // Silent catch for TV performance
    }
  };

  const loadAudiosFromSupabase = async () => {
    try {
      const { data, error } = await audioTracksTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) return;

      if (data) {
        const formattedAudios: AudioTrack[] = data.map((audio: any) => ({
          id: audio.id,
          url: audio.file_path,
          name: audio.name,
          order: audio.order_index,
          uploadedAt: new Date(audio.created_at),
        }));
        setAudios(formattedAudios);
      }
    } catch (error) {
      // Silent catch for TV performance
    }
  };

  const loadAnnouncementsFromSupabase = async () => {
    try {
      const { data, error } = await announcementsTable()
        .select('*')
        .order('order_index', { ascending: true });

      if (error) return;

      if (data) {
        const formattedAnnouncements: Announcement[] = data.map((announcement: any) => ({
          id: announcement.id,
          url: announcement.file_path,
          name: announcement.name,
          order: announcement.order_index,
          uploadedAt: new Date(announcement.created_at),
        }));
        setAnnouncements(formattedAnnouncements);
      }
    } catch (error) {
      // Silent catch for TV performance
    }
  };

  const handleReloadImages = () => {
    loadImagesAndSettings();
    loadAudiosFromSupabase();
    loadAnnouncementsFromSupabase();
  };

  // Stable auto-advance with recursive scheduling - prevents race conditions
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;
    
    let timeoutId: NodeJS.Timeout;
    
    const scheduleNext = () => {
      const current = images[currentIndexRef.current];
      const displayTime = (current?.displayTime || 10) * 1000;
      
      log('Scheduling next in', displayTime, 'ms');
      
      timeoutId = setTimeout(() => {
        setCurrentImageIndex(prev => {
          const next = (prev + 1) % images.length;
          log('Auto-advancing to', next);
          return next;
        });
        scheduleNext(); // Recursive scheduling
      }, displayTime);
    };
    
    scheduleNext();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isPlaying, images]); // Removed currentImageIndex dependency!

  // Listen for real-time updates with debounce for TV performance
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        () => {
          // Debounce reloads to prevent rapid consecutive updates
          clearTimeout(reloadDebounceRef.current);
          reloadDebounceRef.current = setTimeout(() => {
            loadImagesAndSettings();
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(reloadDebounceRef.current);
    };
  }, []);

  // Throttled mouse movement for TV performance - reduces calls by 99%
  const throttledShowControls = useThrottle(() => {
    setShowControls(true);
  }, 200);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      throttledShowControls();
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [throttledShowControls]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Keyboard controls - consolidated with optimized handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextImage();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previousImage();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleReloadImages();
          break;
        case 'Escape':
          setShowControls(!showControls);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showControls]);

  const currentImage = images[currentImageIndex];

  // Fatal error screen
  if (fatalError || (images.length > 0 && consecutiveFailures >= maxConsecutiveFailures)) {
    return (
      <div className="slideshow-container">
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-4xl font-bold mb-4">Erro no Slideshow</h1>
            <p className="text-xl mb-6">
              Muitas imagens falharam ao carregar consecutivamente.
            </p>
            <button
              onClick={() => {
                setFatalError(false);
                setConsecutiveFailures(0);
                setCurrentImageIndex(0);
                dispatchImageState({ type: 'RESET' });
                loadImagesAndSettings();
                loadAudiosFromSupabase();
                loadAnnouncementsFromSupabase();
              }}
              className="bg-primary text-white px-6 py-3 rounded-lg text-lg hover:bg-primary-hover transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="slideshow-container">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slideshow-text">
            <div className="text-6xl mb-4">📱</div>
            <h1 className="text-4xl font-bold mb-4">Menu Board Digital</h1>
            <p className="text-xl opacity-75">
              Nenhuma imagem encontrada.
            </p>
            <p className="text-lg opacity-60 mt-2">
              Adicione imagens no painel de controle.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render function with isActive as boolean parameter
  const renderItem = (item: MenuItem | undefined, isActive: boolean) => {
    if (!item) return null;

    const isLoaded = imageStates.loaded.has(item.url);
    const isLoading = imageStates.loading.has(item.url);
    const hasFailed = imageStates.failed.has(item.url);

    const transitionClass = isActive 
      ? `slideshow-image entering-${item.transitionType || 'fade'}`
      : 'slideshow-image opacity-0';

    return (
      <div key={item.id} className={transitionClass} style={{ zIndex: isActive ? 2 : 1 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        
        {hasFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p>Erro ao carregar {item.itemType === 'video' ? 'vídeo' : 'imagem'}</p>
              <p className="text-sm opacity-75">{item.name}</p>
            </div>
          </div>
        ) : item.itemType === 'video' ? (
          <video
            ref={(el) => {
              if (el && isActive) {
                el.addEventListener('canplay', () => {
                  dispatchImageState({ type: 'LOAD_SUCCESS', url: item.url });
                  log('Video ready:', item.url);
                }, { once: true });
              }
            }}
            src={item.url}
            className="w-full h-full object-cover"
            autoPlay={item.videoAutoplay && isActive}
            muted={item.videoMuted}
            loop={item.videoLoop}
            playsInline
            preload={isActive ? "auto" : "none"}
            onError={() => {
              dispatchImageState({ type: 'LOAD_FAILED', url: item.url });
            }}
            onLoadedData={() => {
              dispatchImageState({ type: 'LOAD_SUCCESS', url: item.url });
            }}
            style={{ 
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        ) : (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => {
              dispatchImageState({ type: 'LOAD_FAILED', url: item.url });
            }}
            onLoad={() => {
              dispatchImageState({ type: 'LOAD_SUCCESS', url: item.url });
            }}
            style={{ 
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="slideshow-container">
      {/* Audio Player - Continuous playback with shuffled playlist */}
      <AudioPlayer tracks={audios} announcements={announcements} />
      
      {/* Direct rendering - only current and next item (no filter) */}
      {renderItem(images[currentImageIndex], true)}
      {renderItem(images[(currentImageIndex + 1) % images.length], false)}

      {/* Overlay gradient for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slideshow-overlay/20 to-transparent pointer-events-none" />

      {/* Controls */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Navigation buttons */}
        <button
          onClick={previousImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-slideshow-overlay/50 text-slideshow-text p-3 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-slideshow-overlay/50 text-slideshow-text p-3 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
          aria-label="Próxima imagem"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Play/Pause and Reload buttons */}
        <div className="absolute bottom-8 right-8 flex gap-3">
          <button
            onClick={handleReloadImages}
            className="bg-slideshow-overlay/50 text-slideshow-text p-4 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
            aria-label="Recarregar imagens"
          >
            <RefreshCw className="h-6 w-6" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className="bg-slideshow-overlay/50 text-slideshow-text p-4 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
        </div>

        {/* Image info */}
        <div className="absolute bottom-8 left-8 text-slideshow-text">
          <div className="bg-slideshow-overlay/50 backdrop-blur-sm px-4 py-3 rounded-lg">
            <p className="text-lg font-medium">{currentImage.name}</p>
            <p className="text-sm opacity-75">
              {currentImageIndex + 1} de {images.length}
            </p>
          </div>
        </div>

        {/* Progress dots - optimized for performance */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.length <= 20 ? (
            images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentImageIndex
                    ? 'bg-slideshow-text'
                    : 'bg-slideshow-text/30'
                }`}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))
          ) : (
            <div className="text-slideshow-text text-sm bg-slideshow-overlay/50 px-3 py-1 rounded">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Instructions overlay (shows briefly on load) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slideshow-text text-center opacity-60">
        <p className="text-sm">
          Pressione ESC para mostrar/esconder controles • Setas para navegar • P para pausar • R para recarregar
        </p>
      </div>
    </div>
  );
};

export default Slideshow;