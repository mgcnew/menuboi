import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface VideoConfigSectionProps {
  videoAutoplay: boolean;
  videoMuted: boolean;
  videoLoop: boolean;
  onAutoplayChange: (value: boolean) => void;
  onMutedChange: (value: boolean) => void;
  onLoopChange: (value: boolean) => void;
}

export const VideoConfigSection = ({
  videoAutoplay,
  videoMuted,
  videoLoop,
  onAutoplayChange,
  onMutedChange,
  onLoopChange
}: VideoConfigSectionProps) => {
  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-medium">Configurações de Vídeo</h4>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="autoplay" className="cursor-pointer">
          Reproduzir automaticamente
        </Label>
        <Switch
          id="autoplay"
          checked={videoAutoplay}
          onCheckedChange={onAutoplayChange}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="muted" className="cursor-pointer">
          Sem áudio (mudo)
        </Label>
        <Switch
          id="muted"
          checked={videoMuted}
          onCheckedChange={onMutedChange}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="loop" className="cursor-pointer">
          Repetir em loop
        </Label>
        <Switch
          id="loop"
          checked={videoLoop}
          onCheckedChange={onLoopChange}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {videoLoop 
          ? "O vídeo será repetido continuamente até o tempo de exibição acabar."
          : "O vídeo será reproduzido uma vez e pausará ao final."}
      </p>
    </div>
  );
};
