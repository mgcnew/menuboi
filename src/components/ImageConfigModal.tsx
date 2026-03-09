import { useState } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { TRANSITION_OPTIONS, TransitionType, DAY_OPTIONS, DayOfWeek } from "@/types/slideshow";
import { VideoConfigSection } from "./VideoConfigSection";
import { Checkbox } from "./ui/checkbox";

interface ImageConfigModalProps {
  image: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedImage: MenuItem) => void;
}

export const ImageConfigModal = ({ image, isOpen, onClose, onSave }: ImageConfigModalProps) => {
  const [displayTime, setDisplayTime] = useState(image?.displayTime || 10);
  const [transitionType, setTransitionType] = useState<TransitionType>(image?.transitionType || 'fade');
  const [videoAutoplay, setVideoAutoplay] = useState(image?.videoAutoplay !== false);
  const [videoMuted, setVideoMuted] = useState(image?.videoMuted !== false);
  const [videoLoop, setVideoLoop] = useState(image?.videoLoop || false);
  const [displayDays, setDisplayDays] = useState<string[] | null>(image?.displayDays || null);

  const allDaysSelected = displayDays === null;

  const handleToggleAllDays = (checked: boolean) => {
    if (checked) {
      setDisplayDays(null);
    } else {
      setDisplayDays(DAY_OPTIONS.map(d => d.value));
    }
  };

  const handleToggleDay = (day: DayOfWeek, checked: boolean) => {
    if (allDaysSelected) {
      // Switching from "all days" to specific: select all except this one if unchecking
      if (!checked) {
        setDisplayDays(DAY_OPTIONS.map(d => d.value).filter(d => d !== day));
      }
      return;
    }
    
    if (checked) {
      const newDays = [...(displayDays || []), day];
      // If all days selected, switch to null
      if (newDays.length === 7) {
        setDisplayDays(null);
      } else {
        setDisplayDays(newDays);
      }
    } else {
      const newDays = (displayDays || []).filter(d => d !== day);
      setDisplayDays(newDays.length > 0 ? newDays : [DAY_OPTIONS[0].value]);
    }
  };

  const handleSave = () => {
    if (!image) return;
    
    onSave({
      ...image,
      displayTime,
      transitionType,
      videoAutoplay,
      videoMuted,
      videoLoop,
      displayDays,
    });
    onClose();
  };

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Slide</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {image.itemType === 'video' ? (
              <video
                src={image.url}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">{image.name}</h3>
          </div>

          {/* Display Days */}
          <div className="space-y-2">
            <Label>Dias de Exibição</Label>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="all-days"
                checked={allDaysSelected}
                onCheckedChange={handleToggleAllDays}
              />
              <label htmlFor="all-days" className="text-sm cursor-pointer">
                Todos os dias
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DAY_OPTIONS.map((day) => (
                <div key={day.value} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={allDaysSelected || (displayDays || []).includes(day.value)}
                    onCheckedChange={(checked) => handleToggleDay(day.value, !!checked)}
                    disabled={allDaysSelected}
                  />
                  <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                    {day.short}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Display Time */}
          <div className="space-y-2">
            <Label htmlFor="display-time">Tempo de Exibição (segundos)</Label>
            <Input
              id="display-time"
              type="number"
              min="5"
              max="60"
              value={displayTime}
              onChange={(e) => setDisplayTime(parseInt(e.target.value) || 10)}
            />
          </div>

          {/* Transition Type */}
          <div className="space-y-2">
            <Label>Tipo de Transição</Label>
            <Select value={transitionType} onValueChange={(value: TransitionType) => setTransitionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Video Settings - Only show for videos */}
          {image.itemType === 'video' && (
            <VideoConfigSection
              videoAutoplay={videoAutoplay}
              videoMuted={videoMuted}
              videoLoop={videoLoop}
              onAutoplayChange={setVideoAutoplay}
              onMutedChange={setVideoMuted}
              onLoopChange={setVideoLoop}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
