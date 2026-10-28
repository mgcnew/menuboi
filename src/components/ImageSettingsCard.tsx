import { Info } from "lucide-react";

import { TransitionType, TRANSITION_OPTIONS, DAY_OPTIONS } from "@/types/slideshow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { CommitNumberInput, SettingRow, SettingsSection } from "@/components/SettingsSection";

interface ImageSettingsCardProps {
  transitionTime: number;
  onTransitionTimeChange: (time: number) => void;
  globalTransitionType: TransitionType;
  onGlobalTransitionTypeChange: (type: TransitionType) => void;
  globalDisplayDays: string[] | null;
  onGlobalDisplayDaysChange: (days: string[] | null) => void;
}

export const ImageSettingsCard = ({
  transitionTime,
  onTransitionTimeChange,
  globalTransitionType,
  onGlobalTransitionTypeChange,
  globalDisplayDays,
  onGlobalDisplayDaysChange
}: ImageSettingsCardProps) => {
  const allDaysSelected = globalDisplayDays === null || globalDisplayDays.length === DAY_OPTIONS.length;
  const selectedDays = allDaysSelected ? DAY_OPTIONS.map(d => d.value) : globalDisplayDays;

  const handleDaysChange = (days: string[]) => {
    // At least one day must stay selected
    if (days.length === 0) return;
    onGlobalDisplayDaysChange(days.length === DAY_OPTIONS.length ? null : days);
  };

  return (
    <SettingsSection
      title="Exibição das mídias"
      description="Ritmo e agenda do slideshow na TV."
    >
      <div className="flex gap-3 py-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Estas opções valem para <span className="font-medium text-foreground">todas as mídias</span> e
          substituem o que foi ajustado em cada uma. Para mudar só uma mídia, use o botão de ajustes no card dela.
        </p>
      </div>

      <SettingRow
        label="Tempo na tela"
        htmlFor="transition-time"
        description="Quanto tempo cada imagem fica na TV. Recomendado: 10 a 15 segundos. Vídeos seguem a própria duração."
      >
        <CommitNumberInput
          id="transition-time"
          value={transitionTime}
          min={5}
          max={60}
          unit="segundos"
          onCommit={onTransitionTimeChange}
        />
      </SettingRow>

      <SettingRow
        label="Dias de exibição"
        description="Dias da semana em que as mídias aparecem na TV."
      >
        <div className="space-y-2">
          <ToggleGroup
            type="multiple"
            value={selectedDays}
            onValueChange={handleDaysChange}
            aria-label="Dias de exibição"
            className="grid grid-cols-7 gap-1"
          >
            {DAY_OPTIONS.map((day) => (
              <ToggleGroupItem
                key={day.value}
                value={day.value}
                aria-label={day.label}
                size="sm"
                className="h-9 border border-input px-0 text-xs text-muted-foreground data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:font-semibold data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90 data-[state=on]:hover:text-background"
              >
                {day.short}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {!allDaysSelected && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={() => onGlobalDisplayDaysChange(null)}
            >
              Voltar para todos os dias
            </Button>
          )}
        </div>
      </SettingRow>

      <SettingRow
        label="Efeito de transição"
        htmlFor="transition-type"
        description="Como uma imagem dá lugar à próxima."
      >
        <Select
          value={globalTransitionType}
          onValueChange={(value: TransitionType) => onGlobalTransitionTypeChange(value)}
        >
          <SelectTrigger id="transition-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSITION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </SettingsSection>
  );
};
