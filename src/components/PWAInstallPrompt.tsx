import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Tv, Monitor, Info, Chrome, Globe, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isAndroidTV = () => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('android') && 
    (ua.includes('tv') || ua.includes('large') || ua.includes('googletv') || ua.includes('aft'))
  ) || (
    ua.includes('android') && 
    window.screen.width >= 1280 && 
    !('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
};

const isSmartTV = () => {
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes('smart-tv') ||
    ua.includes('smarttv') ||
    ua.includes('webos') ||
    ua.includes('tizen') ||
    ua.includes('vidaa') ||
    isAndroidTV()
  );
};

type TVBrowser = 'chrome' | 'puffin' | 'webos' | 'tizen' | 'generic';

const detectTVBrowser = (): TVBrowser => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('puffin')) return 'puffin';
  if (ua.includes('webos') || ua.includes('web0s')) return 'webos';
  if (ua.includes('tizen')) return 'tizen';
  if (ua.includes('chrome') || ua.includes('chromium')) return 'chrome';
  return 'generic';
};

interface BrowserInstruction {
  title: string;
  icon: React.ReactNode;
  steps: string[];
  tip?: string;
}

const getBrowserInstructions = (browser: TVBrowser): BrowserInstruction => {
  switch (browser) {
    case 'chrome':
      return {
        title: 'Chrome / Android TV',
        icon: <Chrome className="h-6 w-6" />,
        steps: [
          'Toque no ícone de menu (⋮) no canto superior direito',
          'Selecione "Adicionar à tela inicial" ou "Instalar app"',
          'Confirme tocando em "Adicionar"',
          'O app aparecerá na tela inicial da sua TV'
        ],
        tip: 'Se não aparecer "Instalar app", tente "Adicionar à tela inicial".'
      };
    case 'puffin':
      return {
        title: 'Puffin TV Browser',
        icon: <Globe className="h-6 w-6" />,
        steps: [
          'Abra o menu lateral do Puffin',
          'Selecione "Criar atalho na tela inicial"',
          'Confirme a criação do atalho',
          'Acesse o app pela tela inicial'
        ],
        tip: 'O Puffin TV é uma ótima opção para Smart TVs Android.'
      };
    case 'webos':
      return {
        title: 'LG WebOS',
        icon: <Monitor className="h-6 w-6" />,
        steps: [
          'Abra o navegador da LG e acesse este endereço',
          'Pressione o botão ⭐ (favoritos) no controle',
          'Adicione aos favoritos para acesso rápido',
          'Acesse pela barra de favoritos sempre que ligar a TV'
        ],
        tip: 'TVs LG não suportam PWA nativamente. Use favoritos para acesso rápido.'
      };
    case 'tizen':
      return {
        title: 'Samsung Tizen',
        icon: <Monitor className="h-6 w-6" />,
        steps: [
          'Abra o navegador Samsung Internet na TV',
          'Acesse este endereço',
          'Pressione "⋮" e depois "Adicionar atalho"',
          'O atalho aparecerá nos apps da TV'
        ],
        tip: 'Use o Samsung Internet para melhor compatibilidade.'
      };
    default:
      return {
        title: 'Navegador da TV',
        icon: <Globe className="h-6 w-6" />,
        steps: [
          'Abra o menu do navegador (geralmente ⋮ ou ☰)',
          'Procure por "Adicionar à tela inicial" ou "Instalar app"',
          'Confirme a instalação',
          'O app aparecerá nos aplicativos da TV'
        ],
        tip: 'Se não encontrar a opção, tente usar o Chrome ou Puffin TV que têm melhor suporte.'
      };
  }
};

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isTV, setIsTV] = useState(false);
  const [showTVInstructions, setShowTVInstructions] = useState(false);
  const [tvBrowser, setTvBrowser] = useState<TVBrowser>('generic');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Smart TVs (Tizen, WebOS, Fire TV, Android TV) cannot install PWAs.
    // Showing the prompt only causes confusion — silently skip on TV devices.
    if (isSmartTV()) {
      setIsTV(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isTV) {
        setShowTVInstructions(true);
      }
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowTVInstructions(false);
  };

  if (isInstalled || !showPrompt) return null;

  // TV-specific instructions with browser detection
  if (isTV && showTVInstructions) {
    const instructions = getBrowserInstructions(tvBrowser);

    return (
      <Card className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex items-center justify-center p-8">
        <div className="max-w-3xl w-full text-center">
          <button 
            onClick={handleDismiss}
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Monitor className="h-12 w-12 text-primary-foreground" />
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Instalar na TV
          </h2>
          <p className="text-lg text-muted-foreground mb-6 flex items-center justify-center gap-2">
            {instructions.icon}
            Detectado: <strong className="text-foreground">{instructions.title}</strong>
          </p>
          
          <div className="bg-card rounded-2xl p-8 mb-8 text-left border">
            <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-3">
              <Info className="h-6 w-6" />
              Siga estes passos:
            </h3>
            <ol className="space-y-4 text-lg text-muted-foreground">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0 text-sm">
                    {index + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: step.replace(/\"([^"]+)\"/g, '<strong class="text-foreground">"$1"</strong>') }} />
                </li>
              ))}
            </ol>
          </div>

          {instructions.tip && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-8">
              <p className="text-accent-foreground text-base">
                💡 <strong>Dica:</strong> {instructions.tip}
              </p>
            </div>
          )}

          <div className="bg-muted rounded-xl p-4 mb-8">
            <p className="text-sm text-muted-foreground mb-1">URL para acessar na TV:</p>
            <code className="text-primary font-mono text-lg font-semibold">
              {window.location.origin}/tv
            </code>
          </div>
          
          <Button 
            onClick={handleDismiss}
            className="font-semibold py-4 px-8 text-xl"
          >
            Entendi
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border-primary/30 p-6 lg:p-8 max-w-2xl w-[90%] shadow-2xl">
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-6 w-6" />
      </button>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 bg-primary rounded-2xl items-center justify-center flex-shrink-0">
          <Tv className="h-8 w-8 lg:h-10 lg:w-10 text-primary-foreground" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2">
            {isTV ? 'Instalar na TV' : 'Instalar App'}
          </h3>
          <p className="text-muted-foreground text-base lg:text-lg mb-4">
            {isTV 
              ? 'Instale para acesso rápido e funcionamento em tela cheia.'
              : 'Instale o Menu Board Digital para acesso rápido e funcionamento offline.'
            }
          </p>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleInstall}
              className="font-semibold py-3 px-6 text-base lg:text-lg"
            >
              <Download className="mr-2 h-5 w-5" />
              {isTV && !deferredPrompt ? 'Como Instalar' : 'Instalar App'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
