import { useState } from "react";
import { MenuItem } from "@/pages/Dashboard";
import { Button } from "./ui/button";
import { Trash2, Eye, GripVertical, SlidersHorizontal, Play, Download, MoreHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ImageConfigModal } from "./ImageConfigModal";
import { DAY_OPTIONS, getCurrentDayOfWeek } from "@/types/slideshow";

interface ImageGridProps {
  images: MenuItem[];
  onImageDelete: (imageId: string) => void;
  onImageReorder: (reorderedImages: MenuItem[]) => void;
  onImageUpdate: (updatedImage: MenuItem) => void;
  filter?: 'all' | 'today' | 'other';
}

export const ImageGrid = ({ images, onImageDelete, onImageReorder, onImageUpdate, filter = 'all' }: ImageGridProps) => {
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [previewImage, setPreviewImage] = useState<MenuItem | null>(null);
  const [configImage, setConfigImage] = useState<MenuItem | null>(null);
  const [deleteImage, setDeleteImage] = useState<MenuItem | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

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

  const moveBy = (image: MenuItem, delta: number) => {
    const from = sortedImages.findIndex(img => img.id === image.id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= sortedImages.length) return;
    const next = [...sortedImages];
    next.splice(from, 1);
    next.splice(to, 0, image);
    onImageReorder(next.map((img, index) => ({ ...img, order: index })));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDownload = async (image: MenuItem) => {
    const urlExt = image.url.split("?")[0].split(".").pop() || (image.itemType === "video" ? "mp4" : "jpg");
    const filename = image.name.includes(".") ? image.name : `${image.name}.${urlExt}`;
    try {
      const res = await fetch(image.url, { mode: "cors" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Direct download failed, opening in new tab:", err);
      const a = document.createElement("a");
      a.href = image.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const today = getCurrentDayOfWeek();
  const playsToday = (image: MenuItem) =>
    !image.displayDays || image.displayDays.length === 0 || image.displayDays.includes(today);

  const isVisible = (image: MenuItem) =>
    filter === 'all' || (filter === 'today' ? playsToday(image) : !playsToday(image));
  const canReorder = filter === 'all';

  const daysLabel = (image: MenuItem) => {
    if (!image.displayDays || image.displayDays.length === 0 || image.displayDays.length === 7) {
      return 'Todos os dias';
    }
    return DAY_OPTIONS
      .filter(d => image.displayDays!.includes(d.value))
      .map(d => d.short)
      .join(', ');
  };

  const visibleImages = sortedImages.filter(isVisible);

  return (
    <>
      {visibleImages.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">
            {filter === 'today' ? 'Nenhuma mídia passa hoje' : 'Todas as mídias passam hoje'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'today'
              ? 'Ajuste os dias de exibição de uma mídia para ela aparecer na TV.'
              : 'Mídias agendadas para outros dias aparecem aqui.'}
          </p>
        </div>
      ) : (
      <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {visibleImages.map((image) => {
          const active = playsToday(image);
          const position = sortedImages.indexOf(image) + 1;
          return (
          <li
            key={image.id}
            className={`
              group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-[box-shadow,border-color,opacity] duration-150
              ${canReorder ? 'cursor-grab active:cursor-grabbing' : ''}
              ${draggedItem?.id === image.id ? 'opacity-40' : 'hover:border-foreground/20 hover:shadow-md'}
              ${dropTargetId === image.id && draggedItem?.id !== image.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
            `}
            draggable={canReorder}
            onDragStart={(e) => handleDragStart(e, image)}
            onDragOver={(e) => { handleDragOver(e); setDropTargetId(image.id); }}
            onDragLeave={() => setDropTargetId(null)}
            onDrop={(e) => { handleDrop(e, image); setDropTargetId(null); }}
            onDragEnd={() => { handleDragEnd(); setDropTargetId(null); }}
          >
            <button
              type="button"
              className="relative block aspect-video w-full overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => setPreviewImage(image)}
              aria-label={`Visualizar ${image.name}`}
            >
              {image.itemType === 'video' ? (
                <video
                  src={image.url}
                  className={`h-full w-full object-cover ${active ? '' : 'opacity-60 grayscale'}`}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <img
                  src={image.url}
                  alt=""
                  loading="lazy"
                  className={`h-full w-full object-cover ${active ? '' : 'opacity-60 grayscale'}`}
                />
              )}

              <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                {position}
              </span>

              {image.itemType === 'video' && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  <Play className="h-3 w-3 fill-current" /> Vídeo
                </span>
              )}

            </button>

            <div className="flex flex-1 items-start gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={image.name}>{image.name}</p>
                <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
                  {image.displayTime}s · {daysLabel(image)}
                </p>
                <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'border border-muted-foreground'}`}
                    aria-hidden="true"
                  />
                  {active ? 'No ar hoje' : 'Não passa hoje'}
                </p>
              </div>

              <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                {canReorder && (
                  <span className="flex h-8 w-6 items-center justify-center text-muted-foreground" title="Arraste para mudar a ordem" aria-hidden="true">
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setConfigImage(image)}
                  aria-label={`Ajustar ${image.name}`}
                  title="Ajustar tempo, transição e dias"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`Mais ações para ${image.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => setPreviewImage(image)}>
                      <Eye className="mr-2 h-4 w-4" /> Visualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setConfigImage(image)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> Ajustar
                    </DropdownMenuItem>
                    {canReorder && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={position === 1} onSelect={() => moveBy(image, -1)}>
                          <ArrowUp className="mr-2 h-4 w-4" /> Passar antes
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={position === sortedImages.length} onSelect={() => moveBy(image, 1)}>
                          <ArrowDown className="mr-2 h-4 w-4" /> Passar depois
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onSelect={() => handleDownload(image)}>
                      <Download className="mr-2 h-4 w-4" /> Baixar arquivo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onSelect={() => setDeleteImage(image)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </li>
          );
        })}
      </ul>
      )}

      <AlertDialog open={!!deleteImage} onOpenChange={(open) => !open && setDeleteImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleteImage?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A mídia sai da TV e o arquivo é apagado. Não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteImage) onImageDelete(deleteImage.id);
                setDeleteImage(null);
              }}
            >
              Excluir mídia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
