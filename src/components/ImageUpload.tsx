import { useCallback, useState } from "react";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { MenuItem } from "@/pages/Dashboard";
import { DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ImageUploadProps {
  onImagesUploaded: (images: MenuItem[]) => void;
}

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.85;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const tryExport = (type: string, quality: number, ext: string) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const name = file.name.replace(/\.[^/.]+$/, "") + `.${ext}`;
              resolve(new File([blob], name, { type: blob.type }));
            } else {
              resolve(file);
            }
          },
          type,
          quality
        );
      };

      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === "image/webp") {
            const name = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            resolve(new File([blob], name, { type: blob.type }));
          } else {
            tryExport("image/jpeg", JPEG_QUALITY, "jpg");
          }
        },
        "image/webp",
        WEBP_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
};

interface CompressionInfo {
  originalSize: number;
  compressedSize: number;
  fileName: string;
}

export const ImageUpload = ({ onImagesUploaded }: ImageUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [compressionInfos, setCompressionInfos] = useState<CompressionInfo[]>([]);
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
    setUploadTotal(validFiles.length);
    setUploadCurrent(0);
    setCompressionInfos([]);
    const newImages: MenuItem[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        let file = validFiles[i];
        const isImage = file.type.startsWith('image/');
        setUploadCurrent(i + 1);
        
        const originalSize = file.size;

        if (isImage) {
          try {
            file = await compressImage(file);
            setCompressionInfos(prev => [...prev, {
              originalSize,
              compressedSize: file.size,
              fileName: validFiles[i].name,
            }]);
          } catch (e) {
            console.warn('Compression failed, uploading original:', e);
          }
        }

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
      // Keep compression infos visible for 5 seconds
      setTimeout(() => setCompressionInfos([]), 5000);
    }
  }, [onImagesUploaded, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFiles(files);
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
    if (files && files.length > 0) processFiles(files);
    e.target.value = '';
  }, [processFiles]);

  const progressPercent = uploadTotal > 0 ? (uploadCurrent / uploadTotal) * 100 : 0;

  return (
    <div className="space-y-3">
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
            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <p className="text-sm font-medium">
                  Enviando {uploadCurrent}/{uploadTotal}...
                </p>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
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

      {/* Compression info badges */}
      {compressionInfos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {compressionInfos.map((info, i) => {
            const savings = Math.round((1 - info.compressedSize / info.originalSize) * 100);
            return (
              <Badge key={i} variant="secondary" className="text-xs font-normal gap-1">
                {formatSize(info.originalSize)} → {formatSize(info.compressedSize)}
                <span className="text-green-600 dark:text-green-400 font-medium">-{savings}%</span>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
