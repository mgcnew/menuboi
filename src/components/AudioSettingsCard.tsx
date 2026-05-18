import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { Music, Loader2, Volume2, Mic } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const AudioSettingsCard = () => {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [interval, setInterval] = useState<number>(5);
  const [musicVolume, setMusicVolume] = useState<number>(0.45);
  const [announcementVolume, setAnnouncementVolume] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const { data, error } = await slideshowSettingsTable()
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        const row = data as any;
        setSettingsId(row.id);
        setInterval(row.announcement_interval_minutes ?? 5);
        if (row.music_volume !== undefined && row.music_volume !== null) setMusicVolume(row.music_volume);
        if (row.announcement_volume !== undefined && row.announcement_volume !== null) setAnnouncementVolume(row.announcement_volume);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (values: { interval?: number, musicVolume?: number, announcementVolume?: number }) => {
    if (!settingsId) return;
    setSaving(true);
    
    const updatePayload: any = {};
    if (values.interval !== undefined) updatePayload.announcement_interval_minutes = values.interval;
    if (values.musicVolume !== undefined) updatePayload.music_volume = values.musicVolume;
    if (values.announcementVolume !== undefined) updatePayload.announcement_volume = values.announcementVolume;

    try {
      const { error } = await slideshowSettingsTable()
        .update(updatePayload)
        .eq("id", settingsId);
      if (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o intervalo.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Configurações salvas",
        description: "As configurações de áudio foram atualizadas.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Música e Locuções</CardTitle>
        </div>
        <CardDescription>
          A música toca continuamente em loop. A cada intervalo definido, uma locução é reproduzida e o volume da música abaixa suavemente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="announcement-interval" className="text-sm font-medium">
            Intervalo entre locuções
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="announcement-interval"
              type="number"
              min={1}
              max={120}
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              onBlur={() => persist({ interval })}
              disabled={loading}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">minutos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Defina de 1 a 120 minutos. As locuções tocam em ordem aleatória sem repetir até completar a lista.
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="h-4 w-4" />
                Volume da Música
              </Label>
              <span className="text-sm text-muted-foreground">{Math.round(musicVolume * 100)}%</span>
            </div>
            <Slider
              value={[musicVolume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(vals) => setMusicVolume(vals[0] / 100)}
              onValueCommit={(vals) => persist({ musicVolume: vals[0] / 100 })}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Mic className="h-4 w-4" />
                Volume da Locução
              </Label>
              <span className="text-sm text-muted-foreground">{Math.round(announcementVolume * 100)}%</span>
            </div>
            <Slider
              value={[announcementVolume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(vals) => setAnnouncementVolume(vals[0] / 100)}
              onValueCommit={(vals) => persist({ announcementVolume: vals[0] / 100 })}
              disabled={loading}
            />
          </div>
        </div>

        {(loading || saving) && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {loading ? "Carregando..." : "Salvando..."}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
