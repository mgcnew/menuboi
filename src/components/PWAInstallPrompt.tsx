import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Tv, Monitor, Info } from 'lucide-react';

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

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isTV, setIsTV] = useState(false);
  const [showTVInstructions, setShowTVInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if it's a TV
    const tvDetected = isSmartTV();
    setIsTV(tvDetected);

    // For TV, show instructions after a delay if no install prompt
    if (tvDetected) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
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
      // If no prompt available (TV), show manual instructions
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

  // TV-specific instructions
  if (isTV && showTVInstructions) {
    return (
      <Card className="fixed inset-0 z-50 bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-8">
        <div className="max-w-3xl w-full text-center">
          <button 
            onClick={handleDismiss}
            className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Monitor className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-6">
            Instalação Manual na TV
          </h2>
          
          <div className="bg-slate-800/50 rounded-2xl p-8 mb-8 text-left">
            <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-3">
              <Info className="h-6 w-6" />
              Siga estes passos:
            </h3>
            <ol className="space-y-4 text-lg text-slate-300">
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</span>
                <span>Abra o <strong className="text-white">menu do navegador</strong> (geralmente 3 pontos ou menu)</span>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</span>
                <span>Procure por <strong className="text-white">"Adicionar à tela inicial"</strong> ou <strong className="text-white">"Instalar app"</strong></span>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</span>
                <span>Confirme a instalação</span>
              </li>
              <li className="flex gap-4">
                <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">4</span>
                <span>O app aparecerá nos seus <strong className="text-white">aplicativos da TV</strong></span>
              </li>
            </ol>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
            <p className="text-amber-300 text-base">
              💡 <strong>Dica:</strong> Se não encontrar a opção, tente usar o navegador <strong>Chrome</strong> ou <strong>Puffin TV</strong> que têm melhor suporte para PWA.
            </p>
          </div>
          
          <Button 
            onClick={handleDismiss}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-8 text-xl"
          >
            Entendi
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800/95 backdrop-blur-xl border-blue-500/30 p-6 lg:p-8 max-w-2xl w-[90%] shadow-2xl shadow-blue-500/20">
      <button 
        onClick={handleDismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>
      
      <div className="flex items-center gap-6">
        <div className="hidden sm:flex w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl items-center justify-center flex-shrink-0">
          <Tv className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
            {isTV ? 'Instalar na TV' : 'Instalar App'}
          </h3>
          <p className="text-slate-300 text-base lg:text-lg mb-4">
            {isTV 
              ? 'Instale para acesso rápido e funcionamento em tela cheia.'
              : 'Instale o Menu Board Digital para acesso rápido e funcionamento offline.'
            }
          </p>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleInstall}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 text-base lg:text-lg"
            >
              <Download className="mr-2 h-5 w-5" />
              {isTV && !deferredPrompt ? 'Como Instalar' : 'Instalar App'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white"
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
