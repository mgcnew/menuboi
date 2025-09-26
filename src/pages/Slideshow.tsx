import { useState, useEffect, useCallback } from "react";
import { MenuImage } from "./Dashboard";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Pause, Play, RefreshCw, Loader2, Shuffle } from "lucide-react";

const Slideshow = () => {
  const [images, setImages] = useState<MenuImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [randomTransitions, setRandomTransitions] = useState<string[]>([]);
  const [useRandomTransitions, setUseRandomTransitions] = useState(true);

  // Available transitions for random mode
  const availableTransitions = [
    'fade',
    'slide-left',
    'slide-right', 
    'slide-up',
    'slide-down',
    'zoom-in',
    'zoom-out',
    'rotate-in',
    'flip-in',
    'push-left',
    'push-right',
    'wipe-in',
    'scale-bounce',
    'slide-diagonal'
  ];

  // Generate random transitions for all images
  const generateRandomTransitions = useCallback(() => {
    return images.map(() => {
      const randomIndex = Math.floor(Math.random() * availableTransitions.length);
      return availableTransitions[randomIndex];
    });
  }, [images, availableTransitions]);

  // Generate random transitions when images change
  useEffect(() => {
    if (images.length > 0) {
      setRandomTransitions(generateRandomTransitions());
    }
  }, [images, generateRandomTransitions]);

  // Preload images for better performance
  const preloadImage = useCallback((url: string) => {
    if (loadedImages.has(url) || loadingImages.has(url) || failedImages.has(url)) {
      return;
    }

    setLoadingImages(prev => new Set(prev).add(url));
    
    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(url));
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    };
    img.onerror = () => {
      setFailedImages(prev => new Set(prev).add(url));
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    };
    img.src = url;
  }, [loadedImages, loadingImages, failedImages]);

  // Preload current and next images
  useEffect(() => {
    if (images.length === 0) return;
    
    // Preload current image and next 2 images
    for (let i = 0; i < Math.min(3, images.length); i++) {
      const imageIndex = (currentImageIndex + i) % images.length;
      preloadImage(images[imageIndex].url);
    }
  }, [images, currentImageIndex, preloadImage]);

  useEffect(() => {
    loadImagesAndSettings();
  }, []);

  const loadImagesAndSettings = async () => {
    try {
      // Load directly from Supabase for real-time data
      const { data, error } = await supabase
        .from('menu_images')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading images from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const formattedImages = data.map((img: any) => ({
          id: img.id,
          url: `https://rsyqznvjpmwoibgohptz.supabase.co/storage/v1/object/public/menu-images/${img.file_path}`,
          name: img.name,
          order: img.order_index,
          uploadedAt: new Date(img.created_at),
          displayTime: img.display_time,
          transitionType: img.transition_type
        }));
        setImages(formattedImages);
        // Reset loading states when images change
        setLoadedImages(new Set());
        setLoadingImages(new Set());
        setFailedImages(new Set());
        // Generate random transitions for new images
        setRandomTransitions(generateRandomTransitions());
      } else {
        setImages([]);
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
    }
  };

  const handleReloadImages = () => {
    loadImagesAndSettings();
  };

  // Auto-advance slideshow with individual timing
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const currentImage = images[currentImageIndex];
    const displayTime = currentImage?.displayTime || 10; // Default 10s if not set

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, displayTime * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, images, currentImageIndex]);

  // Listen for real-time updates from Supabase
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'menu_images'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          loadImagesAndSettings(); // Reload images when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Show/hide controls on mouse movement
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const toggleRandomTransitions = () => {
    setUseRandomTransitions(!useRandomTransitions);
    if (!useRandomTransitions) {
      // Generate new random transitions when enabling
      setRandomTransitions(generateRandomTransitions());
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Keyboard controls
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
        case 's':
        case 'S':
          e.preventDefault();
          toggleRandomTransitions();
          break;
        case 'Escape':
          setShowControls(!showControls);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showControls]);

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

  const currentImage = images[currentImageIndex];

  const renderImage = (image: MenuImage, index: number) => {
    const isActive = index === currentImageIndex;
    const isLoaded = loadedImages.has(image.url);
    const isLoading = loadingImages.has(image.url);
    const hasFailed = failedImages.has(image.url);
    
    // Only render current image and next image for better performance
    const shouldRender = isActive || index === (currentImageIndex + 1) % images.length;
    
    if (!shouldRender) return null;

    // Use random transition if random mode is enabled and available, 
    // otherwise fallback to image's transition type, then to fade
    const transitionType = useRandomTransitions && randomTransitions[index] 
      ? randomTransitions[index] 
      : image.transitionType || 'fade';
    const transitionClass = isActive 
      ? `slideshow-image entering-${transitionType}`
      : 'slideshow-image opacity-0';

    return (
      <div key={image.id} className={transitionClass} style={{ zIndex: isActive ? 2 : 1 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        
        {hasFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p>Erro ao carregar imagem</p>
              <p className="text-sm opacity-75">{image.name}</p>
            </div>
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.name}
            className="w-full h-full object-cover"
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
      {/* Optimized Images - Only render current and next */}
      {images.map(renderImage)}

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

        {/* Play/Pause, Random Transitions and Reload buttons */}
        <div className="absolute bottom-8 right-8 flex gap-3">
          <button
            onClick={handleReloadImages}
            className="bg-slideshow-overlay/50 text-slideshow-text p-4 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
            aria-label="Recarregar imagens"
          >
            <RefreshCw className="h-6 w-6" />
          </button>

          <button
            onClick={toggleRandomTransitions}
            className={`p-4 rounded-full transition-colors ${
              useRandomTransitions 
                ? 'bg-primary/80 text-white hover:bg-primary' 
                : 'bg-slideshow-overlay/50 text-slideshow-text hover:bg-slideshow-overlay/75'
            }`}
            aria-label={useRandomTransitions ? "Desativar transições aleatórias" : "Ativar transições aleatórias"}
          >
            <Shuffle className="h-6 w-6" />
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

        {/* Progress dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
          {images.map((_, index) => (
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
          ))}
        </div>
      </div>

      {/* Instructions overlay (shows briefly on load) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slideshow-text text-center opacity-60">
        <p className="text-sm">
          ESC: controles • Setas: navegar • P: pausar • R: recarregar • S: transições {useRandomTransitions ? 'aleatórias' : 'fixas'}
        </p>
      </div>
    </div>
  );
};

export default Slideshow;