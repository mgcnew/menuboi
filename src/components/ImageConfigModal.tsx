import { useState } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";

interface ImageConfigModalProps {
  image: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedImage: MenuItem) => void;
}

export const ImageConfigModal = ({ image, isOpen, onClose, onSave }: ImageConfigModalProps) => {
  const handleDownload = async () => {
    if (!image?.url) return;
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleSave = () => {
    if (!image) return;
    onSave(image);
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} className="mr-auto gap-2">
            Baixar
          </Button>
          <Button onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
