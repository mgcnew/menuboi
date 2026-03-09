import { useState } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Trash2, Eye, GripVertical, Settings, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageConfigModal } from "./ImageConfigModal";
import { DAY_OPTIONS } from "@/types/slideshow";

interface ImageGridProps {
  images: MenuItem[];
  onImageDelete: (imageId: string) => void;
  onImageReorder: (reorderedImages: MenuItem[]) => void;
  onImageUpdate: (updatedImage: MenuItem) => void;
}

export const ImageGrid = ({ images, onImageDelete, onImageReorder, onImageUpdate }: ImageGridProps) => {
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [previewImage, setPreviewImage] = useState<MenuItem | null>(null);
  const [configImage, setConfigImage] = useState<MenuItem | null>(null);

  if (images.length === 0) {
    return null;
  }

  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, image: MenuItem) => {
    setDraggedItem(image);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetImage: MenuItem) => {
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

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sortedImages.map((image, index) => (
          <div
            key={image.id}
            className={`
              relative group cursor-move rounded-lg overflow-hidden bg-muted
              aspect-video transition-all duration-200
              ${draggedItem?.id === image.id ? 'opacity-50 scale-95' : 'hover:ring-2 hover:ring-primary/50'}
            `}
            draggable
            onDragStart={(e) => handleDragStart(e, image)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, image)}
            onDragEnd={handleDragEnd}
          >
            {/* Order Badge */}
            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded z-10">
              {index + 1}
            </div>

            {/* Video indicator */}
            {image.itemType === 'video' && (
              <div className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded z-10">
                <Play className="h-3 w-3" />
              </div>
            )}

            {/* Media */}
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

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewImage(image);
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfigImage(image);
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageDelete(image.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Drag Handle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
              <GripVertical className="h-5 w-5 text-white/50" />
            </div>
          </div>
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
              {previewImage.itemType === 'video' ? (
                <video
                  src={previewImage.url}
                  controls
                  className="w-full h-auto max-h-[70vh] rounded-lg"
                />
              ) : (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              )}
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
