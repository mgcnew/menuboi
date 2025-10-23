import { useCallback, useState } from "react";
import { Upload, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AudioTrack } from "@/types/slideshow";

interface AudioUploadProps {
  onAudiosUploaded: (audios: AudioTrack[]) => void;
}

export const AudioUpload = ({ onAudiosUploaded }: AudioUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadToSupabase = async (file: File): Promise<AudioTrack | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('audio-tracks')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading audio:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(filePath);

      return {
        id: crypto.randomUUID(),
        name: file.name,
        url: publicUrl,
        order: 0,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in uploadToSupabase:', error);
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsUploading(true);
    
    const audioFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/')
    );

    if (audioFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de áudio.",
        variant: "destructive"
      });
      setIsUploading(false);
      return;
    }

    try {
      const uploadPromises = audioFiles.map(file => uploadToSupabase(file));
      const uploadedAudios = await Promise.all(uploadPromises);
      const successfulAudios = uploadedAudios.filter((audio): audio is AudioTrack => audio !== null);

      if (successfulAudios.length > 0) {
        onAudiosUploaded(successfulAudios);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível fazer upload dos áudios.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error uploading audios:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar os áudios.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-lg p-12 transition-all ${
        isDragging 
          ? 'border-primary bg-accent/50 scale-[1.02]' 
          : 'border-muted hover:border-primary hover:bg-accent/20'
      }`}
    >
      <input
        type="file"
        multiple
        accept="audio/*"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />
      
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {isUploading ? (
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          ) : (
            <Music className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        
        <h3 className="text-lg font-semibold mb-2">
          {isUploading ? 'Enviando áudios...' : 'Upload de Músicas/Vinhetas'}
        </h3>
        
        <p className="text-muted-foreground mb-4">
          Arraste os arquivos de áudio aqui ou clique para selecionar
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>Suporta MP3, WAV, OGG e outros formatos de áudio</span>
        </div>
      </div>
    </div>
  );
};