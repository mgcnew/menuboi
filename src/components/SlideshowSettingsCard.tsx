import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/types/slideshow";
import { slideshowSettingsTable } from "@/lib/supabase-helpers";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sun, Minimize2, Building2, Upload, Loader2, Palette } from "lucide-react";

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
      if (updates.showLogo !== undefined) dbUpdates.show_logo = updates.showLogo;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;
      if (updates.logoPosition !== undefined) dbUpdates.logo_position = updates.logoPosition;
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
        title: "Configurações salvas",
        description: "As alterações serão aplicadas no slideshow.",
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

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

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

      if (uploadError) throw uploadError;

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
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Aparência</CardTitle>
        </div>
        <CardDescription>
          Tema visual, logo e mensagem exibida no slideshow.
        </CardDescription>
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
                  flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left
                  ${settings.theme === theme.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                  }
                `}
              >
                {THEME_ICONS[theme.value]}
                <div>
                  <div className="text-sm font-medium">{theme.label}</div>
                  <div className="text-xs text-muted-foreground">{theme.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-sm font-medium">Logo da Empresa</Label>

          <div className="flex items-center space-x-2">
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
              Exibir logo no slideshow
            </label>
          </div>

          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <>
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="h-12 w-auto object-contain rounded border"
                />
                <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                  Remover
                </Button>
              </>
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
            <div>
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
                  {POSITION_OPTIONS.filter((p) => p.value !== "bottom-center").map((pos) => (
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
            <div>
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
