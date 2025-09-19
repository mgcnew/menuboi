import { useState } from "react";
import { MenuImage } from "@/pages/Dashboard";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Trash2, Eye, GripVertical, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageConfigModal } from "./ImageConfigModal";

interface ImageGridProps {
  images: MenuImage[];
  onImageDelete: (imageId: string) => void;
  onImageReorder: (reorderedImages: MenuImage[]) => void;
  onImageUpdate: (updatedImage: MenuImage) => void;
}

export const ImageGrid = ({ images, onImageDelete, onImageReorder, onImageUpdate }: ImageGridProps) => {
  const [draggedItem, setDraggedItem] = useState<MenuImage | null>(null);
  const [previewImage, setPreviewImage] = useState<MenuImage | null>(null);
  const [configImage, setConfigImage] = useState<MenuImage | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4 opacity-20">🖼️</div>
        <h3 className="text-lg font-medium text-muted-foreground">
          Nenhuma imagem carregada
        </h3>
        <p className="text-muted-foreground">
          Faça upload das suas imagens para começar
        </p>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, image: MenuImage) => {
    setDraggedItem(image);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetImage: MenuImage) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetImage.id) {
      setDraggedItem(null);
      return;
    }

    const draggedIndex = sortedImages.findIndex(img => img.id === draggedItem.id);
    const targetIndex = sortedImages.findIndex(img => img.id === targetImage.id);

    const newImages = [...sortedImages];
    newImages.splice(draggedIndex, 1);
    newImages.splice(targetIndex, 0, draggedItem);

    // Update order property
    const reorderedImages = newImages.map((img, index) => ({
      ...img,
      order: index
    }));

    onImageReorder(reorderedImages);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <>
      <div className="image-grid">
        {sortedImages.map((image, index) => (
          <Card
            key={image.id}
            className={`relative group cursor-move transition-all duration-200 ${
              draggedItem?.id === image.id ? 'opacity-50 scale-95' : ''
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, image)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, image)}
            onDragEnd={handleDragEnd}
          >
            {/* Order indicator */}
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-md z-10">
              {index + 1}
            </div>

            {/* Drag handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <GripVertical className="h-6 w-6 text-white drop-shadow-lg" />
            </div>

            {/* Image */}
            <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>

            {/* Image info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm truncate">{image.name}</h4>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewImage(image)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfigImage(image)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onImageDelete(image.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{formatDate(image.uploadedAt)}</p>
                <p className="capitalize">
                  {image.transitionType?.replace('-', ' ')} • {image.displayTime}s
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewImage.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Config Modal */}
      <ImageConfigModal
        image={configImage}
        isOpen={!!configImage}
        onClose={() => setConfigImage(null)}
        onSave={onImageUpdate}
      />
    </>
  );
};