import { useEffect, useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  bucket: "audio-tracks" | "announcements";
  filePath: string;
  fileName: string;
}

export const AudioPreviewControls = ({ bucket, filePath, fileName }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // filePath may be a full public URL or a relative path inside the bucket
  const isFullUrl = /^https?:\/\//i.test(filePath);
  const relativePath = isFullUrl
    ? decodeURIComponent(filePath.split(`/object/public/${bucket}/`)[1] || filePath.split("/").pop() || "")
    : filePath;
  const publicUrl = isFullUrl
    ? filePath
    : supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(publicUrl);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => {
        toast.error("Erro ao reproduzir áudio");
        setPlaying(false);
      };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {
        toast.error("Erro ao reproduzir áudio");
      });
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const { data, error } = await supabase.storage.from(bucket).download(relativePath);
      if (error || !data) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      const ext = filePath.split(".").pop() || "mp3";
      a.download = fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao baixar arquivo");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        title={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={downloading}
        title="Baixar arquivo"
      >
        <Download className="h-4 w-4 mr-1" />
        {downloading ? "Baixando..." : "Baixar"}
      </Button>
    </div>
  );
};
