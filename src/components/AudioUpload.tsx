import { useCallback, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
      className={`relative cursor-pointer rounded-lg border border-dashed px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-input bg-card hover:border-foreground/30 hover:bg-muted/40'
      } ${isUploading ? 'pointer-events-none' : ''}`}
    >
      <input
        type="file"
        multiple
        accept="audio/*"
        aria-label="Adicionar músicas"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={isUploading}
      />

      {isUploading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm font-medium tabular-nums">Enviando {uploadCurrent} de {uploadTotal}…</p>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium">Adicionar músicas</span>
            <span className="text-muted-foreground"> · arraste aqui ou clique · MP3, WAV, OGG</span>
          </p>
        </div>
      )}
    </div>
  );
};
