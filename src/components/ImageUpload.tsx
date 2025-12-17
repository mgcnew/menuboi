import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { MenuItem } from "@/pages/Dashboard";
import { DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImagesUploaded: (images: MenuItem[]) => void;
}

export const ImageUpload = ({ onImagesUploaded }: ImageUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => {
      const isImage = file.type.startsWith('image/') && 
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isVideo = file.type.startsWith('video/') && 
        ['video/mp4', 'video/webm', 'video/ogg'].includes(file.type);
      return isImage || isVideo;
    });

    if (validFiles.length === 0) {
      toast({
        title: "Arquivos inválidos",
        description: "Por favor, selecione apenas imagens (JPG, PNG, WebP) ou vídeos (MP4, WebM, OGG).",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newImages: MenuItem[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('menu-images')
          .upload(fileName, file);

        if (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Erro no upload",
            description: `Não foi possível fazer upload de ${file.name}`,
            variant: "destructive"
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        const isVideo = file.type.startsWith('video/');
        const image: MenuItem = {
          id: crypto.randomUUID(),
          url: publicUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
          order: Date.now() + i,
          uploadedAt: new Date(),
          displayTime: DEFAULT_DISPLAY_TIME,
          transitionType: DEFAULT_TRANSITION_TYPE,
          itemType: isVideo ? 'video' : 'image',
          videoAutoplay: true,
          videoMuted: true,
          videoLoop: false
        };

        newImages.push(image);
      }

      if (newImages.length > 0) {
        onImagesUploaded(newImages);
        const imageCount = newImages.filter(img => img.itemType === 'image').length;
        const videoCount = newImages.filter(img => img.itemType === 'video').length;
        const description = [
          imageCount > 0 && `${imageCount} imagem(ns)`,
          videoCount > 0 && `${videoCount} vídeo(s)`
        ].filter(Boolean).join(' e ') + ' enviado(s) com sucesso.';
        
        toast({
          title: "Upload concluído!",
          description,
        });
      }
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante o upload das imagens.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [onImagesUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  }, [processFiles]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
        ${isDragOver 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !isUploading && document.getElementById('file-input')?.click()}
    >
      <div className="flex flex-col items-center gap-2">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium">Enviando...</p>
          </>
        ) : (
          <>
            <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-medium">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP, MP4, WebM
              </p>
            </div>
          </>
        )}
      </div>

      <input
        id="file-input"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
