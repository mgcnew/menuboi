import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  url?: string;
  title?: string;
  description?: string;
  size?: number;
  compact?: boolean;
}

export const QRCodeDisplay = ({ 
  url, 
  title = "Acesso rápido para TV",
  description = "Escaneie com o celular para abrir na TV",
  size = 160,
  compact = false
}: QRCodeDisplayProps) => {
  const { toast } = useToast();
  const tvUrl = url || `${window.location.origin}/tv`;

  const copyUrl = () => {
    navigator.clipboard.writeText(tvUrl);
    toast({ title: "Link copiado!" });
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3 sm:w-48">
        <div className="rounded-lg border bg-white p-3">
          <QRCodeSVG value={tvUrl} size={136} level="M" />
        </div>
        <div className="w-full min-w-0 text-center">
          <p className="text-xs text-muted-foreground">{title}</p>
          <code className="mt-0.5 block truncate font-mono text-xs font-medium" title={tvUrl}>{tvUrl}</code>
          <Button variant="outline" size="sm" className="mt-2 h-8 w-full gap-1.5" onClick={copyUrl}>
            <Copy className="h-3.5 w-3.5" /> Copiar link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6 rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-md">
      <h3 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
        <QrCode className="h-5 w-5 text-primary" />
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <QRCodeSVG value={tvUrl} size={size} level="M" includeMargin={false} />
        </div>
        
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground text-center">URL da TV:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono text-primary truncate">
              {tvUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
