import { useCallback, useState } from "react";
import { Mic, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Announcement } from "@/types/slideshow";
import { Progress } from "@/components/ui/progress";

interface AnnouncementUploadProps {
  onAnnouncementsUploaded: (announcements: Announcement[]) => void;
}

export const AnnouncementUpload = ({ onAnnouncementsUploaded }: AnnouncementUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const { toast } = useToast();

  const uploadToSupabase = async (file: File): Promise<Announcement | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('announcements')
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading to Supabase:', error);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(fileName);

      return {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: publicUrl,
        order: Date.now(),
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error in uploadToSupabase:', error);
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    const audioFiles = Array.from(files).filter(file => 
      file.type.startsWith('audio/') && 
      ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'].includes(file.type)
    );

    if (audioFiles.length === 0) {
      toast({
        title: "Arquivos inválidos",
        description: "Por favor, selecione apenas arquivos de áudio (MP3, WAV, OGG, M4A).",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadTotal(audioFiles.length);
    setUploadCurrent(0);
    const uploadedAnnouncements: Announcement[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      setUploadCurrent(i + 1);
      const announcement = await uploadToSupabase(audioFiles[i]);
      if (announcement) {
        uploadedAnnouncements.push(announcement);
      }
    }

    setIsUploading(false);

    if (uploadedAnnouncements.length > 0) {
      onAnnouncementsUploaded(uploadedAnnouncements);
      toast({
        title: "Locuções carregadas!",
        description: `${uploadedAnnouncements.length} locuçã(ões) enviada(s) com sucesso.`,
      });
    } else {
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload das locuções.",
        variant: "destructive"
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
    e.target.value = '';
  }, []);

  const progressPercent = uploadTotal > 0 ? (uploadCurrent / uploadTotal) * 100 : 0;

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-5 transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'} ${isUploading ? 'opacity-60' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        id="announcement-input"
        type="file"
        multiple
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a"
        aria-label="Adicionar locuções"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          {isUploading ? (
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <Mic className="h-7 w-7 text-primary" />
          )}
        </div>
        
        <div className="min-w-0">
          {isUploading ? (
            <div className="space-y-2 max-w-xs mx-auto">
              <p className="text-sm font-medium">Enviando {uploadCurrent}/{uploadTotal}...</p>
              <Progress value={progressPercent} className="h-2" />
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold mb-1">Adicionar locuções</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="h-4 w-4" />
                <span>MP3, WAV, OGG, M4A</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
