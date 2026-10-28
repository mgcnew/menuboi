import { useCallback, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
        aria-label="Adicionar locuções"
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
            <span className="font-medium">Adicionar locuções</span>
            <span className="text-muted-foreground"> · arraste aqui ou clique · MP3, WAV, OGG, M4A</span>
          </p>
        </div>
      )}
    </div>
  );
};
