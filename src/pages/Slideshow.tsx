import { useState, useEffect } from "react";
import { MenuImage } from "./Dashboard";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const Slideshow = () => {
  const [images, setImages] = useState<MenuImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    loadImagesAndSettings();
  }, []);

  const loadImagesAndSettings = async () => {
    // First try localStorage
    const savedImages = localStorage.getItem('menuboard-images');

    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages);
        setImages(parsedImages.sort((a: MenuImage, b: MenuImage) => a.order - b.order));
        return; // If localStorage has images, use them
      } catch (e) {
        console.error('Error loading images from localStorage:', e);
      }
    }

    // Fallback to Supabase if localStorage is empty
    try {
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
        // Save to localStorage for future use
        localStorage.setItem('menuboard-images', JSON.stringify(formattedImages));
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
    }
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

  // Listen for real-time updates
  useEffect(() => {
    const handleStorageChange = () => {
      const savedImages = localStorage.getItem('menuboard-images');
      
      if (savedImages) {
        try {
          const parsedImages = JSON.parse(savedImages);
          setImages(parsedImages.sort((a: MenuImage, b: MenuImage) => a.order - b.order));
        } catch (e) {
          console.error('Error loading updated images:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  return (
    <div className="slideshow-container">
      {/* Images with Transitions */}
      {images.map((image, index) => {
        const isActive = index === currentImageIndex;
        const transitionClass = isActive 
          ? `slideshow-image entering-${image.transitionType || 'fade'}`
          : 'slideshow-image opacity-0';
        
        return (
          <img
            key={image.id}
            src={image.url}
            alt={image.name}
            className={transitionClass}
            style={{
              zIndex: isActive ? 2 : 1
            }}
          />
        );
      })}

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

        {/* Play/Pause button */}
        <button
          onClick={togglePlayPause}
          className="absolute bottom-8 right-8 bg-slideshow-overlay/50 text-slideshow-text p-4 rounded-full hover:bg-slideshow-overlay/75 transition-colors"
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </button>

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
          Pressione ESC para mostrar/esconder controles • Setas para navegar • P para pausar
        </p>
      </div>
    </div>
  );
};

export default Slideshow;