import { useState } from "react";
import { MenuImage } from "@/pages/Dashboard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { TRANSITION_OPTIONS, TransitionType } from "@/types/slideshow";

interface ImageConfigModalProps {
  image: MenuImage | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedImage: MenuImage) => void;
}

export const ImageConfigModal = ({ image, isOpen, onClose, onSave }: ImageConfigModalProps) => {
  const [displayTime, setDisplayTime] = useState(image?.displayTime || 10);
  const [transitionType, setTransitionType] = useState<TransitionType>(image?.transitionType || 'fade');

  const handleSave = () => {
    if (!image) return;
    
    onSave({
      ...image,
      displayTime,
      transitionType
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
            <img
              src={image.url}
              alt={image.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">{image.name}</h3>
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