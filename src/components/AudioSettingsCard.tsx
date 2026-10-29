import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone } from "lucide-react";
import { requestAnnouncementOnTv } from "@/lib/tv-control";
import { CommitNumberInput, SettingRow, SettingsSection, useSaveState } from "@/components/SettingsSection";

export const AudioSettingsCard = () => {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [interval, setInterval] = useState<number>(5);
  const [musicVolume, setMusicVolume] = useState<number>(0.45);
  const [announcementVolume, setAnnouncementVolume] = useState<number>(1.0);
  const [musicDuckVolume, setMusicDuckVolume] = useState<number>(0.08);
  const [fadeDownMs, setFadeDownMs] = useState<number>(900);
  const [fadeUpMs, setFadeUpMs] = useState<number>(1600);
  const [musicShuffle, setMusicShuffle] = useState<boolean>(true);
  const [testing, setTesting] = useState(false);
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
        if (row.music_duck_volume !== undefined && row.music_duck_volume !== null) setMusicDuckVolume(row.music_duck_volume);
        if (row.duck_fade_down_ms !== undefined && row.duck_fade_down_ms !== null) setFadeDownMs(row.duck_fade_down_ms);
        if (row.duck_fade_up_ms !== undefined && row.duck_fade_up_ms !== null) setFadeUpMs(row.duck_fade_up_ms);
        if (row.music_shuffle !== undefined && row.music_shuffle !== null) setMusicShuffle(row.music_shuffle);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (values: {
    interval?: number,
    musicVolume?: number,
    announcementVolume?: number,
    musicDuckVolume?: number,
    fadeDownMs?: number,
    fadeUpMs?: number,
    musicShuffle?: boolean,
  }) => {
    if (!settingsId) return;
    setSaving(true);
    
    const updatePayload: any = {};
    if (values.interval !== undefined) updatePayload.announcement_interval_minutes = values.interval;
    if (values.musicVolume !== undefined) updatePayload.music_volume = values.musicVolume;
    if (values.announcementVolume !== undefined) updatePayload.announcement_volume = values.announcementVolume;
    if (values.musicDuckVolume !== undefined) updatePayload.music_duck_volume = values.musicDuckVolume;
    if (values.fadeDownMs !== undefined) updatePayload.duck_fade_down_ms = values.fadeDownMs;
    if (values.fadeUpMs !== undefined) updatePayload.duck_fade_up_ms = values.fadeUpMs;
    if (values.musicShuffle !== undefined) updatePayload.music_shuffle = values.musicShuffle;

    try {
      const { error } = await slideshowSettingsTable()
        .update(updatePayload)
        .eq("id", settingsId);
      if (error) {
        console.error(error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as configurações de áudio. Tente de novo.",
          variant: "destructive",
        });
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const saveState = useSaveState(saving);

  const testAnnouncement = async () => {
    setTesting(true);
    try {
      await requestAnnouncementOnTv();
      toast({
        title: "Locução enviada",
        description: "As TVs abertas tocam a próxima locução em alguns segundos.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível falar com as TVs. Confira a conexão e tente de novo.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const fadeRow = (
    id: string,
    label: string,
    description: string,
    valueMs: number,
    setValueMs: (v: number) => void,
    commit: (v: number) => void,
  ) => (
    <SettingRow label={label} htmlFor={id} description={description}>
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          aria-label={label}
          value={[valueMs]}
          min={200}
          max={5000}
          step={100}
          onValueChange={(vals) => setValueMs(vals[0])}
          onValueCommit={(vals) => commit(vals[0])}
          disabled={loading}
        />
        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {(valueMs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s
        </span>
      </div>
    </SettingRow>
  );

  const volumeRow = (
    id: string,
    label: string,
    description: string,
    value: number,
    setValue: (v: number) => void,
    commit: (v: number) => void,
  ) => (
    <SettingRow label={label} htmlFor={id} description={description}>
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          aria-label={label}
          value={[value * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={(vals) => setValue(vals[0] / 100)}
          onValueCommit={(vals) => commit(vals[0] / 100)}
          disabled={loading}
        />
        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>
    </SettingRow>
  );

  return (
    <SettingsSection
      title="Música e locuções"
      description="A música toca sem parar. A cada intervalo, uma locução entra e a música abaixa."
      status={loading ? "idle" : saveState}
    >
      <SettingRow
        label="Intervalo entre locuções"
        htmlFor="announcement-interval"
        description="De 1 a 120 minutos. As locuções tocam em ordem aleatória, sem repetir até passar por todas."
      >
        <CommitNumberInput
          id="announcement-interval"
          value={interval}
          min={1}
          max={120}
          unit="minutos"
          disabled={loading}
          onCommit={(v) => {
            setInterval(v);
            persist({ interval: v });
          }}
        />
      </SettingRow>

      {volumeRow(
        "music-volume",
        "Volume da música",
        "Volume normal da música ambiente.",
        musicVolume,
        setMusicVolume,
        (v) => persist({ musicVolume: v }),
      )}

      {volumeRow(
        "announcement-volume",
        "Volume da locução",
        "Volume das locuções quando entram.",
        announcementVolume,
        setAnnouncementVolume,
        (v) => persist({ announcementVolume: v }),
      )}

      {volumeRow(
        "duck-volume",
        "Música durante a locução",
        "Quanto a música abaixa enquanto a locução toca. Use 0% para silenciar.",
        musicDuckVolume,
        setMusicDuckVolume,
        (v) => persist({ musicDuckVolume: v }),
      )}

      {fadeRow(
        "duck-fade-down",
        "Tempo para a música abaixar",
        "Quanto a música leva para abaixar antes de a voz entrar.",
        fadeDownMs,
        setFadeDownMs,
        (v) => persist({ fadeDownMs: v }),
      )}

      {fadeRow(
        "duck-fade-up",
        "Tempo para a música voltar",
        "Quanto a música leva para voltar ao volume normal depois da locução.",
        fadeUpMs,
        setFadeUpMs,
        (v) => persist({ fadeUpMs: v }),
      )}

      <SettingRow
        label="Músicas em ordem aleatória"
        htmlFor="music-shuffle"
        description="Desligado, as músicas tocam na ordem da lista ou da playlist."
      >
        <Switch
          id="music-shuffle"
          checked={musicShuffle}
          disabled={loading}
          onCheckedChange={(checked) => {
            setMusicShuffle(checked);
            persist({ musicShuffle: checked });
          }}
        />
      </SettingRow>

      <SettingRow
        label="Testar locução"
        description="Toca a próxima locução agora nas TVs abertas, com a música abaixando como no intervalo normal."
      >
        <Button variant="outline" onClick={testAnnouncement} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
          Testar locução agora
        </Button>
      </SettingRow>
    </SettingsSection>
  );
};
