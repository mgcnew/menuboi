import { useState, useEffect } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Button } from "./ui/button";

interface SlideshowPreviewProps {
  images: MenuItem[];
  className?: string;
}

export const SlideshowPreview = ({ images, className = "" }: SlideshowPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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
      <div className={`bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-2">📺</div>
          <p className="text-sm">Preview do Slideshow</p>
          <p className="text-xs">Adicione imagens para ver o preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border shadow-soft rounded-lg overflow-hidden ${className}`}>
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
        <div className="absolute top-2 right-2 bg-slideshow-overlay/50 text-slideshow-text px-2 py-1 rounded text-xs">
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
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            disabled={images.length <= 1}
          >
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
          Preview
        </div>
      </div>
    </div>
  );
};