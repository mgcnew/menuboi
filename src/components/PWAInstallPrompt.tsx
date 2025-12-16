import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, X, Tv } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
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
    if (!deferredPrompt) return;

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
  };

  if (isInstalled || !showPrompt) return null;

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
            Instalar na TV
          </h3>
          <p className="text-slate-300 text-base lg:text-lg mb-4">
            Instale o Menu Board Digital para acesso rápido e funcionamento offline.
          </p>
          
          <div className="flex gap-4">
            <Button 
              onClick={handleInstall}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 text-base lg:text-lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Instalar App
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
