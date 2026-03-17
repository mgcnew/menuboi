import { useCallback, useState } from "react";
import { Upload, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AudioTrack } from "@/types/slideshow";
import { Progress } from "@/components/ui/progress";

interface AudioUploadProps {
  onAudiosUploaded: (audios: AudioTrack[]) => void;
}

export const AudioUpload = ({ onAudiosUploaded }: AudioUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const { toast } = useToast();

  const uploadToSupabase = async (file: File): Promise<AudioTrack | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-tracks')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading audio:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(fileName);

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
    const audioFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/')
    );

    if (audioFiles.length === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de áudio.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadTotal(audioFiles.length);
    setUploadCurrent(0);

    try {
      const successfulAudios: AudioTrack[] = [];
      for (let i = 0; i < audioFiles.length; i++) {
        setUploadCurrent(i + 1);
        const result = await uploadToSupabase(audioFiles[i]);
        if (result) successfulAudios.push(result);
      }

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

  const progressPercent = uploadTotal > 0 ? (uploadCurrent / uploadTotal) * 100 : 0;

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
            <div className="w-full max-w-xs space-y-3">
              <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Enviando {uploadCurrent}/{uploadTotal}...</p>
              <Progress value={progressPercent} className="h-2" />
            </div>
          ) : (
            <Music className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        
        {!isUploading && (
          <>
            <h3 className="text-lg font-semibold mb-2">Upload de Músicas/Vinhetas</h3>
            <p className="text-muted-foreground mb-4">
              Arraste os arquivos de áudio aqui ou clique para selecionar
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Suporta MP3, WAV, OGG e outros formatos de áudio</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
