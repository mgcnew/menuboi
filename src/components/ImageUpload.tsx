import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { MenuImage } from "@/pages/Dashboard";
import { DEFAULT_DISPLAY_TIME, DEFAULT_TRANSITION_TYPE } from "@/types/slideshow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImagesUploaded: (images: MenuImage[]) => void;
}

export const ImageUpload = ({ onImagesUploaded }: ImageUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/') && 
      ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );

    if (validFiles.length === 0) {
      toast({
        title: "Arquivos inválidos",
        description: "Por favor, selecione apenas imagens JPG, PNG ou WebP.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newImages: MenuImage[] = [];
    const newPreviews: string[] = [];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${i}.${fileExt}`;
        
        // Upload to Supabase Storage
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

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('menu-images')
          .getPublicUrl(fileName);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const previewUrl = e.target?.result as string;
          newPreviews.push(previewUrl);
        };
        reader.readAsDataURL(file);

        const image: MenuImage = {
          id: crypto.randomUUID(),
          url: publicUrl,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          order: Date.now() + i,
          uploadedAt: new Date(),
          displayTime: DEFAULT_DISPLAY_TIME,
          transitionType: DEFAULT_TRANSITION_TYPE
        };

        newImages.push(image);
      }

      if (newImages.length > 0) {
        onImagesUploaded(newImages);
        setPreviews([]);
        toast({
          title: "Upload concluído!",
          description: `${newImages.length} imagem(ns) enviada(s) com sucesso.`,
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
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  const clearPreviews = () => {
    setPreviews([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`upload-area ${isDragOver ? 'dragover' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className={`p-4 rounded-full ${isDragOver ? 'bg-primary/10' : 'bg-muted'}`}>
            {isUploading ? (
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            ) : (
              <Upload className={`h-8 w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            )}
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">
              {isUploading ? 'Processando imagens...' : 'Arraste suas imagens aqui'}
            </h3>
            <p className="text-muted-foreground mb-4">
              ou clique para selecionar arquivos
            </p>
            <p className="text-sm text-muted-foreground">
              Suporte: JPG, PNG, WebP • Máximo: 10MB por arquivo
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={isUploading}
            className="bg-background hover:bg-muted"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Selecionar Imagens
          </Button>

          <input
            id="file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Preview Area */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Pré-visualização ({previews.length})</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={clearPreviews}
            >
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          </div>
          
          <div className="image-grid">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};