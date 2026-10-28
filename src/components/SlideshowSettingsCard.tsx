import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingRow, SettingsSection, useSaveState } from "@/components/SettingsSection";
import { useToast } from "@/hooks/use-toast";
import { SlideshowSettings, WidgetPosition } from "@/types/slideshow";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { Sun, Moon } from "lucide-react";

export const SlideshowSettingsCard = () => {
  const [settings, setSettings] = useState<SlideshowSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await slideshowSettingsTable()
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      if (data) {
        const row = data as any;
        setSettings({
          id: row.id,
          theme: row.theme,
          showClock: row.show_clock,
          showDate: row.show_date,
          showWeather: row.show_weather,
          weatherLocation: row.weather_location || "São Paulo",
          weatherLat: parseFloat(row.weather_lat) || -23.5505,
          weatherLon: parseFloat(row.weather_lon) || -46.6333,
          showLogo: row.show_logo,
          logoUrl: row.logo_url,
          logoPosition: (row.logo_position || "top-left") as WidgetPosition,
          customMessage: row.custom_message,
          customMessagePosition: (row.custom_message_position || "bottom-center") as WidgetPosition,
          announcementIntervalMinutes: row.announcement_interval_minutes ?? 5,
          musicVolume: row.music_volume ?? 0.45,
          announcementVolume: row.announcement_volume ?? 1.0,
          musicDuckVolume: row.music_duck_volume ?? 0.08,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (updates: Partial<SlideshowSettings>) => {
    if (!settings) return;

    setSaving(true);
    try {
      const dbUpdates: Record<string, any> = {};

      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.customMessage !== undefined) dbUpdates.custom_message = updates.customMessage;
      if (updates.customMessagePosition !== undefined) dbUpdates.custom_message_position = updates.customMessagePosition;

      const { error } = await slideshowSettingsTable()
        .update(dbUpdates)
        .eq("id", settings.id);

      if (error) {
        console.error("Error saving settings:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar a aparência da TV. Tente de novo.",
          variant: "destructive",
        });
        return;
      }

      setSettings({ ...settings, ...updates });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const saveState = useSaveState(saving);

  if (loading) {
    return (
      <Card className="hover:shadow-sm">
        <div className="space-y-4 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="hover:shadow-sm">
        <div className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar a aparência da TV. Verifique a conexão e tente de novo.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadSettings(); }}>
            Tentar de novo
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <SettingsSection
      title="Aparência da TV"
      description="Como o slideshow aparece na tela da loja. Não muda o tema deste painel."
      status={saveState}
    >
      <SettingRow
        label="Tema da TV"
        description="Cor de fundo dos relógios, avisos e letreiro na TV."
      >
        <ToggleGroup
          type="single"
          value={settings.theme}
          onValueChange={(value) => value && saveSettings({ theme: value as SlideshowSettings["theme"] })}
          aria-label="Tema da TV"
          className="grid grid-cols-2 gap-2"
        >
          <ToggleGroupItem
            value="light"
            className="h-10 gap-2 border border-input data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground"
          >
            <Sun className="h-4 w-4" /> Claro
          </ToggleGroupItem>
          <ToggleGroupItem
            value="dark"
            className="h-10 gap-2 border border-input data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground"
          >
            <Moon className="h-4 w-4" /> Noturno
          </ToggleGroupItem>
        </ToggleGroup>
      </SettingRow>

      <SettingRow
        label="Letreiro no rodapé"
        htmlFor="custom-message"
        description="Texto que passa deslizando na parte de baixo da TV. Deixe vazio para não mostrar."
      >
        <Input
          id="custom-message"
          value={settings.customMessage || ""}
          onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
          onBlur={() => saveSettings({ customMessage: settings.customMessage })}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Ex.: Aceitamos Pix e cartão"
        />
      </SettingRow>
    </SettingsSection>
  );
};
