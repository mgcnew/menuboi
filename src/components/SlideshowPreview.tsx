import { useState, useEffect, useMemo } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { getCurrentDayOfWeek, DAY_OPTIONS } from "@/types/slideshow";

interface SlideshowPreviewProps {
  images: MenuItem[];
  className?: string;
}

export const SlideshowPreview = ({ images: allImages, className = "" }: SlideshowPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Filter by current day to match TV behavior
  const today = getCurrentDayOfWeek();
  const todayLabel = DAY_OPTIONS.find(d => d.value === today)?.short || today;
  const images = useMemo(
    () => allImages.filter(img =>
      !img.displayDays || img.displayDays.length === 0 || img.displayDays.includes(today)
    ),
    [allImages, today]
  );

  // Reset index if filter shrinks the list
  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  const currentImage = images[currentIndex];
  const displayTime = currentImage?.displayTime || 10;

  // Auto-advance and progress
  useEffect(() => {
    if (!isPlaying || images.length === 0) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((i) => (i + 1) % images.length);
          return 0;
        }
        return prev + (100 / (displayTime * 10)); // Update every 100ms
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, images.length, displayTime, currentIndex]);

  // Reset progress when changing slides manually
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const togglePlayPause = () => setIsPlaying(!isPlaying);
  
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setProgress(0);
  };
  
  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setProgress(0);
  };

  if (images.length === 0) {
    return (
      <div className={`bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center aspect-video ${className}`}>
        <div className="text-center text-muted-foreground p-4">
          <div className="text-4xl mb-2">📺</div>
          <p className="text-sm">Preview do Slideshow</p>
          <p className="text-xs">
            {allImages.length === 0
              ? "Adicione imagens para ver o preview"
              : `Nenhuma mídia agendada para hoje (${todayLabel})`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border-0 shadow-lg rounded-xl overflow-hidden ${className}`}>
      {/* Preview Display */}
      <div className="relative aspect-video bg-slideshow-bg">
        {currentImage && (
          currentImage.itemType === 'video' ? (
            <video
              src={currentImage.url}
              className="w-full h-full object-cover"
              autoPlay={currentImage.videoAutoplay}
              muted={currentImage.videoMuted}
              loop={currentImage.videoLoop}
              playsInline
            />
          ) : (
            <img
              src={currentImage.url}
              alt={currentImage.name}
              className="w-full h-full object-cover"
            />
          )
        )}
        
        {/* Overlay with transition info */}
        <div className="absolute inset-0 bg-gradient-to-t from-slideshow-overlay/60 to-transparent pointer-events-none" />
        
        {/* Image info */}
        <div className="absolute bottom-2 left-2 text-slideshow-text text-xs">
          <p className="font-medium">{currentImage?.name}</p>
          <p className="opacity-75">
            {currentImage?.transitionType} • {currentImage?.displayTime}s
          </p>
        </div>

        {/* Slide counter */}
        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-md text-[10px] font-bold">
          {currentIndex + 1}/{images.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center justify-between bg-muted/30">
        <div className="flex items-center space-x-1.5">
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full"
            <SkipBack className="h-3 w-3" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            disabled={images.length === 0}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            disabled={images.length <= 1}
          >
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {allImages.length !== images.length
            ? `${images.length}/${allImages.length} • Hoje: ${todayLabel}`
            : `Preview • ${todayLabel}`}
        </div>
      </div>
    </div>
  );
};