import { ReactNode, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved";

export const SaveStatus = ({ state }: { state: SaveState }) => {
  if (state === "idle") return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {state === "saving" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando
        </>
      ) : (
        <>
          <Check className="h-3.5 w-3.5 text-success" /> Salvo
        </>
      )}
    </span>
  );
};

/** Shows "Salvo" for a moment after a save finishes. */
export const useSaveState = (saving: boolean) => {
  const [state, setState] = useState<SaveState>("idle");
  const [wasSaving, setWasSaving] = useState(false);

  useEffect(() => {
    if (saving) {
      setState("saving");
      setWasSaving(true);
      return;
    }
    if (!wasSaving) return;
    setState("saved");
    const t = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(t);
  }, [saving, wasSaving]);

  return state;
};

interface SettingsSectionProps {
  title: string;
  description?: ReactNode;
  status?: SaveState;
  children: ReactNode;
}

export const SettingsSection = ({ title, description, status = "idle", children }: SettingsSectionProps) => (
  <Card className="hover:shadow-sm">
    <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="pt-0.5">
        <SaveStatus state={status} />
      </div>
    </div>
    <div className="divide-y px-6">{children}</div>
  </Card>
);

interface SettingRowProps {
  label: string;
  htmlFor?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SettingRow = ({ label, htmlFor, description, children, className }: SettingRowProps) => (
  <div className={cn("grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,300px)] sm:gap-8", className)}>
    <div className="min-w-0 space-y-1">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <div className="min-w-0 sm:pt-0.5">{children}</div>
  </div>
);

interface CommitNumberInputProps {
  id: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}

/** Number field that only commits on blur or Enter, clamped to [min, max]. */
export const CommitNumberInput = ({ id, value, min, max, unit, disabled, onCommit }: CommitNumberInputProps) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(draft, 10);
    const next = Number.isNaN(parsed) ? value : Math.min(max, Math.max(min, parsed));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-24 tabular-nums"
      />
      <span className="text-sm text-muted-foreground">{unit}</span>
    </div>
  );
};
