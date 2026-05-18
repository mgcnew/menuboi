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
import { MessageSquare, Loader2 } from "lucide-react";

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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Mensagem Fixa</CardTitle>
        </div>
        <CardDescription>
          Configure uma mensagem de texto que ficará visível sobre as mídias.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom Message */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sua Mensagem</Label>
          <Input
            value={settings.customMessage || ""}
            onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
            onBlur={() => saveSettings({ customMessage: settings.customMessage })}
            placeholder="Ex: Oferta especial: 20% de desconto!"
            className="w-full"
          />

          {settings.customMessage && (
            <div className="pt-2">
              <Label htmlFor="message-position" className="text-xs text-muted-foreground mb-1 block">
                Posição na tela
              </Label>
              <Select
                value={settings.customMessagePosition}
                onValueChange={(value) => saveSettings({ customMessagePosition: value as WidgetPosition })}
              >
                <SelectTrigger id="message-position" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
