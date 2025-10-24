import { useCallback, useState } from "react";
import { Music, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Announcement } from "@/types/slideshow";

interface AnnouncementUploadProps {
  onAnnouncementsUploaded: (announcements: Announcement[]) => void;
}

export const AnnouncementUpload = ({ onAnnouncementsUploaded }: AnnouncementUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
    const uploadedAnnouncements: Announcement[] = [];

    for (const file of audioFiles) {
      const announcement = await uploadToSupabase(file);
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
    if (files.length > 0) {
      handleFiles(files);
    }
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
    if (files && files.length > 0) {
      handleFiles(files);
    }
    e.target.value = '';
  }, []);

  return (
    <div
      className={`upload-area ${isDragging ? 'dragover' : ''} ${isUploading ? 'opacity-60' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !isUploading && document.getElementById('announcement-input')?.click()}
    >
      <input
        id="announcement-input"
        type="file"
        multiple
        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-primary/10' : 'bg-muted'}`}>
          {isUploading ? (
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <Music className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">
            {isUploading ? 'Fazendo upload...' : 'Arraste suas locuções aqui'}
          </h3>
          <p className="text-muted-foreground mb-2">
            ou clique para selecionar arquivos
          </p>
          <p className="text-sm text-muted-foreground">
            MP3, WAV, OGG, M4A • Máximo: 10MB por arquivo
          </p>
        </div>
      </div>
    </div>
  );
};
