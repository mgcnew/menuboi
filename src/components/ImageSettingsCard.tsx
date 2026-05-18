import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon } from "lucide-react";

import { TransitionType, TRANSITION_OPTIONS, DAY_OPTIONS, DayOfWeek } from "@/types/slideshow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  const allDaysSelected = globalDisplayDays === null;

  const handleToggleAllDays = (checked: boolean) => {
    if (checked) {
      onGlobalDisplayDaysChange(null);
    } else {
      onGlobalDisplayDaysChange(DAY_OPTIONS.map(d => d.value));
    }
  };

  const handleToggleDay = (day: DayOfWeek, checked: boolean) => {
    if (allDaysSelected) {
      if (!checked) {
        onGlobalDisplayDaysChange(DAY_OPTIONS.map(d => d.value).filter(d => d !== day));
      }
      return;
    }
    
    if (checked) {
      const newDays = [...(globalDisplayDays || []), day];
      if (newDays.length === 7) {
        onGlobalDisplayDaysChange(null);
      } else {
        onGlobalDisplayDaysChange(newDays);
      }
    } else {
      const newDays = (globalDisplayDays || []).filter(d => d !== day);
      onGlobalDisplayDaysChange(newDays.length > 0 ? newDays : [DAY_OPTIONS[0].value]);
    }
  };
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

        <div className="space-y-2 pt-4 border-t">
          <Label>Dias de Exibição Global</Label>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="global-all-days"
              checked={allDaysSelected}
              onCheckedChange={(checked) => handleToggleAllDays(!!checked)}
            />
            <label htmlFor="global-all-days" className="text-sm cursor-pointer">
              Todos os dias
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DAY_OPTIONS.map((day) => (
              <div key={day.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={`global-day-${day.value}`}
                  checked={allDaysSelected || (globalDisplayDays || []).includes(day.value)}
                  onCheckedChange={(checked) => handleToggleDay(day.value, !!checked)}
                />
                <label htmlFor={`global-day-${day.value}`} className="text-sm cursor-pointer">
                  {day.short}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Aplica-se a todas as imagens do slideshow.
          </p>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Label>Efeito de Transição Global</Label>
          <Select 
            value={globalTransitionType} 
            onValueChange={(value: TransitionType) => onGlobalTransitionTypeChange(value)}
          >
            <SelectTrigger>
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
          <p className="text-xs text-muted-foreground">
            Este efeito será aplicado entre todos os slides (imagens).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
