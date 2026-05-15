import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon } from "lucide-react";

interface ImageSettingsCardProps {
  transitionTime: number;
  onTransitionTimeChange: (time: number) => void;
}

export const ImageSettingsCard = ({ transitionTime, onTransitionTimeChange }: ImageSettingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Imagens e Vídeos</CardTitle>
        </div>
        <CardDescription>
          Controle o ritmo da exibição das mídias no slideshow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="transition-time" className="text-sm font-medium">
            Tempo entre imagens
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="transition-time"
              type="number"
              min={5}
              max={60}
              value={transitionTime}
              onChange={(e) => onTransitionTimeChange(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">segundos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recomendado: 10–15 segundos. Vale para imagens estáticas — vídeos seguem sua própria duração.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
