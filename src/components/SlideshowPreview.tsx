import { useState, useEffect, useMemo } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Play, Pause, SkipBack, SkipForward, MonitorOff } from "lucide-react";
import { Button } from "./ui/button";
import { getCurrentDayOfWeek, DAY_OPTIONS } from "@/types/slideshow";

interface SlideshowPreviewProps {
  images: MenuItem[];
  className?: string;
  /** Reports the id of the item on screen, so a list can highlight it. */
  onCurrentChange?: (id: string | null) => void;
}

export const SlideshowPreview = ({ images: allImages, className = "", onCurrentChange }: SlideshowPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Filter by current day to match TV behavior
  const today = getCurrentDayOfWeek();
  const todayLabel = DAY_OPTIONS.find(d => d.value === today)?.label || today;
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

  useEffect(() => {
    onCurrentChange?.(currentImage?.id ?? null);
  }, [currentImage?.id, onCurrentChange]);
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
      <div className={`flex aspect-video items-center justify-center rounded-lg border border-dashed bg-muted/50 ${className}`}>
        <div className="max-w-[16rem] p-4 text-center">
          <MonitorOff className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">A TV está sem mídia hoje</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {allImages.length === 0
              ? "Envie uma imagem ou vídeo para ver a prévia."
              : `Nenhuma mídia agendada para ${todayLabel.toLowerCase()}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border bg-card ${className}`}>
      <div className="relative aspect-video bg-black">
        {currentImage && (
          currentImage.itemType === 'video' ? (
            <video
              key={currentImage.id}
              src={currentImage.url}
              className="h-full w-full object-cover"
              autoPlay={isPlaying}
              muted
              loop={currentImage.videoLoop}
              playsInline
            />
          ) : (
            <img
              src={currentImage.url}
              alt={currentImage.name}
              className="h-full w-full object-cover"
            />
          )
        )}
        <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
          Prévia no painel
        </div>
        <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      <div className="h-0.5 bg-muted" aria-hidden="true">
        <div
          className="h-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentImage?.name}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{currentImage?.displayTime}s na tela</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevSlide} disabled={images.length <= 1} aria-label="Mídia anterior">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause} aria-label={isPlaying ? "Pausar prévia" : "Reproduzir prévia"}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextSlide} disabled={images.length <= 1} aria-label="Próxima mídia">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
