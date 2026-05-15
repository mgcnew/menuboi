import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  SlideshowTheme, 
  WidgetPosition,
  THEME_OPTIONS, 
  POSITION_OPTIONS,
  DEFAULT_SLIDESHOW_SETTINGS 
} from "@/types/slideshow";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sun, Minimize2, Building2, Upload, Loader2 } from "lucide-react";

const THEME_ICONS: Record<SlideshowTheme, React.ReactNode> = {
  dark: <Moon className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  minimal: <Minimize2 className="h-4 w-4" />,
  branded: <Building2 className="h-4 w-4" />,
};

export const SlideshowSettingsCard = () => {
  const [settings, setSettings] = useState<SlideshowSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
          theme: row.theme as SlideshowTheme,
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
      
      if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
      if (updates.showClock !== undefined) dbUpdates.show_clock = updates.showClock;
      if (updates.showDate !== undefined) dbUpdates.show_date = updates.showDate;
      if (updates.showWeather !== undefined) dbUpdates.show_weather = updates.showWeather;
      if (updates.weatherLocation !== undefined) dbUpdates.weather_location = updates.weatherLocation;
      if (updates.weatherLat !== undefined) dbUpdates.weather_lat = updates.weatherLat;
      if (updates.weatherLon !== undefined) dbUpdates.weather_lon = updates.weatherLon;
      if (updates.showLogo !== undefined) dbUpdates.show_logo = updates.showLogo;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.logoPosition !== undefined) dbUpdates.logo_position = updates.logoPosition;
      if (updates.customMessage !== undefined) dbUpdates.custom_message = updates.customMessage;
      if (updates.customMessagePosition !== undefined) dbUpdates.custom_message_position = updates.customMessagePosition;
      if (updates.announcementIntervalMinutes !== undefined) dbUpdates.announcement_interval_minutes = updates.announcementIntervalMinutes;

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
        title: "Configurações salvas",
        description: "As alterações serão aplicadas automaticamente no slideshow.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileName = `logo-${Date.now()}.${file.name.split(".").pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("menu-images")
        .getPublicUrl(fileName);

      await saveSettings({ logoUrl: publicUrl, showLogo: true });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do logo.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    await saveSettings({ logoUrl: null, showLogo: false });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground text-center">
          Não foi possível carregar as configurações.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Aparência do Slideshow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tema Visual</Label>
          <div className="grid grid-cols-2 gap-2">
            {THEME_OPTIONS.map((theme) => (
              <button
                key={theme.value}
                onClick={() => saveSettings({ theme: theme.value })}
                className={`
                  flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                  ${settings.theme === theme.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                  }
                `}
              >
                {THEME_ICONS[theme.value]}
                <div className="text-left">
                  <div className="text-sm font-medium">{theme.label}</div>
                  <div className="text-xs text-muted-foreground">{theme.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Widgets */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Widgets de Informação</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-clock"
                checked={settings.showClock}
                onCheckedChange={(checked) => saveSettings({ showClock: !!checked })}
              />
              <label htmlFor="show-clock" className="text-sm cursor-pointer">
                Mostrar relógio
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-date"
                checked={settings.showDate}
                onCheckedChange={(checked) => saveSettings({ showDate: !!checked })}
              />
              <label htmlFor="show-date" className="text-sm cursor-pointer">
                Mostrar data
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-weather"
                checked={settings.showWeather}
                onCheckedChange={(checked) => saveSettings({ showWeather: !!checked })}
              />
              <label htmlFor="show-weather" className="text-sm cursor-pointer">
                Mostrar temperatura
              </label>
            </div>
          </div>

          {settings.showWeather && (
            <div className="mt-3">
              <Label htmlFor="weather-location" className="text-xs text-muted-foreground">
                Cidade
              </Label>
              <Input
                id="weather-location"
                value={settings.weatherLocation}
                onChange={(e) => setSettings({ ...settings, weatherLocation: e.target.value })}
                onBlur={() => saveSettings({ weatherLocation: settings.weatherLocation })}
                placeholder="São Paulo"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A temperatura é obtida automaticamente via API
              </p>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Logo da Empresa</Label>
          
          <div className="flex items-center space-x-2 mb-3">
            <Checkbox
              id="show-logo"
              checked={settings.showLogo}
              onCheckedChange={(checked) => saveSettings({ showLogo: !!checked })}
              disabled={!settings.logoUrl}
            />
            <label 
              htmlFor="show-logo" 
              className={`text-sm cursor-pointer ${!settings.logoUrl ? "text-muted-foreground" : ""}`}
            >
              Exibir logo
            </label>
          </div>

          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-auto object-contain rounded border"
                />
                <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                  Remover
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("logo-upload")?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Logo
                </Button>
              </div>
            )}
          </div>

          {settings.logoUrl && (
            <div className="mt-3">
              <Label htmlFor="logo-position" className="text-xs text-muted-foreground">
                Posição do Logo
              </Label>
              <Select
                value={settings.logoPosition}
                onValueChange={(value) => saveSettings({ logoPosition: value as WidgetPosition })}
              >
                <SelectTrigger id="logo-position" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.filter(p => p.value !== "bottom-center").map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Custom Message */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Mensagem Personalizada</Label>
          <Input
            value={settings.customMessage || ""}
            onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
            onBlur={() => saveSettings({ customMessage: settings.customMessage })}
            placeholder="Ex: Promoção especial hoje!"
          />
          
          {settings.customMessage && (
            <div className="mt-3">
              <Label htmlFor="message-position" className="text-xs text-muted-foreground">
                Posição da Mensagem
              </Label>
              <Select
                value={settings.customMessagePosition}
                onValueChange={(value) => saveSettings({ customMessagePosition: value as WidgetPosition })}
              >
                <SelectTrigger id="message-position" className="mt-1">
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

        {/* Audio - Announcement interval */}
        <div className="space-y-3 pt-4 border-t">
          <Label htmlFor="announcement-interval" className="text-sm font-medium">
            Intervalo entre locuções (minutos)
          </Label>
          <p className="text-xs text-muted-foreground">
            A música toca continuamente e abaixa de volume suavemente quando uma locução começa, voltando ao normal ao terminar.
          </p>
          <Input
            id="announcement-interval"
            type="number"
            min={1}
            max={120}
            value={settings.announcementIntervalMinutes}
            onChange={(e) =>
              setSettings({ ...settings, announcementIntervalMinutes: Math.max(1, parseInt(e.target.value) || 1) })
            }
            onBlur={() => saveSettings({ announcementIntervalMinutes: settings.announcementIntervalMinutes })}
            className="max-w-[140px]"
          />
        </div>
        {saving && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </div>
        )}
      </CardContent>
    </Card>
  );
};