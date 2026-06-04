import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  SlideshowSettings,
  WidgetPosition,
  POSITION_OPTIONS,
} from "@/types/slideshow";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { MessageSquare, Loader2, Sun, Moon, Layout, Palette } from "lucide-react";

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
          description: "Não foi possível salvar as configurações.",
          variant: "destructive",
        });
        return;
      }

      setSettings({ ...settings, ...updates });
      toast({
        title: "Mensagem salva",
        description: "As alterações serão aplicadas no slideshow.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Não foi possível carregar as configurações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-md overflow-hidden rounded-2xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Estilo e Mensagens</CardTitle>
        </div>
        <CardDescription>
          Personalize o visual e as mensagens fixas do seu slideshow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" /> Tema Visual
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => saveSettings({ theme: 'light' })}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                settings.theme === 'light' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30'
              }`}
            >
              <Sun className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">Claro</span>
            </button>
            <button
              onClick={() => saveSettings({ theme: 'dark' })}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                settings.theme === 'dark' 
                  ? 'border-primary bg-primary/5 text-primary' 
                  : 'border-muted bg-muted/20 text-muted-foreground hover:border-muted-foreground/30'
              }`}
            >
              <Moon className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-wider">Noturno</span>
            </button>
          </div>
        </div>

        {/* Custom Message */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Mensagem em Movimento (Rodapé)
          </Label>
          <Input
            value={settings.customMessage || ""}
            onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
            onBlur={() => saveSettings({ customMessage: settings.customMessage })}
            placeholder="Ex: Oferta especial: 20% de desconto!"
            className="w-full bg-background/50 border-muted-foreground/20 focus:border-primary/50 transition-all rounded-xl"
          />
          <p className="text-[10px] text-muted-foreground italic">
            * A mensagem aparecerá como um letreiro deslizante na parte inferior da tela.
          </p>
        </div>

        {saving && (
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
