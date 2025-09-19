import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Tv, Settings, Play, QrCode } from "lucide-react";

const Welcome = () => {
  const [selectedOption, setSelectedOption] = useState<'tv' | 'desktop'>('tv');
  const navigate = useNavigate();

  // Keyboard/Remote control navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedOption('tv');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedOption('desktop');
          break;
        case 'Enter':
        case ' ':
        case 'OK': // Some TV remotes use this
          e.preventDefault();
          if (selectedOption === 'tv') {
            navigate('/tv');
          } else {
            navigate('/dashboard');
          }
          break;
        case 'Escape':
        case 'Back': // TV remote back button
          e.preventDefault();
          // Could add back navigation if needed
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedOption, navigate]);

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Monitor className="h-16 w-16 text-primary mr-4" />
            <div>
              <h1 className="text-5xl font-bold text-slideshow-text mb-2">
                Menu Board Digital
              </h1>
              <p className="text-xl text-slideshow-text/70">
                Sistema de Exibição Profissional
              </p>
            </div>
          </div>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* TV Mode */}
          <Card className={`bg-card/10 backdrop-blur-sm shadow-strong transition-all duration-300 p-8 text-center cursor-pointer ${
            selectedOption === 'tv' 
              ? 'border-primary/60 ring-2 ring-primary/30 scale-105 animate-pulse' 
              : 'border-primary/20 hover:border-primary/40'
          }`}
          onClick={() => navigate('/tv')}
          onMouseEnter={() => setSelectedOption('tv')}>
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Tv className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-slideshow-text mb-3">
                Modo TV
              </h2>
              <p className="text-slideshow-text/70 mb-6">
                Perfeito para TVs e displays. Interface otimizada para visualização à distância com controles simplificados.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link to="/tv">
                <Button className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground font-semibold py-6 text-lg">
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar no Modo TV
                </Button>
              </Link>
              
              <div className="text-xs text-slideshow-text/50 space-y-1">
                <p>• Controle remoto TV/teclado</p>
                <p>• Interface fullscreen</p>
                <p>• Transições suaves</p>
                {selectedOption === 'tv' && (
                  <p className="text-primary font-medium animate-fade-in">← Pressione ENTER para selecionar</p>
                )}
              </div>
            </div>
          </Card>

          {/* Desktop Mode */}
          <Card className={`bg-card/10 backdrop-blur-sm shadow-strong transition-all duration-300 p-8 text-center cursor-pointer ${
            selectedOption === 'desktop' 
              ? 'border-accent/60 ring-2 ring-accent/30 scale-105 animate-pulse' 
              : 'border-accent/20 hover:border-accent/40'
          }`}
          onClick={() => navigate('/dashboard')}
          onMouseEnter={() => setSelectedOption('desktop')}>
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-10 w-10 text-accent-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-slideshow-text mb-3">
                Modo Desktop
              </h2>
              <p className="text-slideshow-text/70 mb-6">
                Painel administrativo completo. Gerencie imagens, configure transições e monitore o sistema.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link to="/dashboard">
                <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold py-6 text-lg">
                  <Monitor className="mr-2 h-5 w-5" />
                  Abrir Painel Admin
                </Button>
              </Link>
              
              <div className="text-xs text-slideshow-text/50 space-y-1">
                <p>• Upload de imagens</p>
                <p>• Configurações avançadas</p>
                <p>• Preview em tempo real</p>
                {selectedOption === 'desktop' && (
                  <p className="text-accent font-medium animate-fade-in">← Pressione ENTER para selecionar</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Access */}
        <Card className="bg-card/5 backdrop-blur-sm border-slideshow-text/10 p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slideshow-text mb-4 flex items-center justify-center">
              <QrCode className="mr-2 h-5 w-5" />
              Acesso Rápido via Controle Remoto
            </h3>
            <div className="mb-4">
              <p className="text-sm text-slideshow-text/60">
                Use as <span className="text-primary font-medium">setas ← →</span> para navegar e <span className="text-primary font-medium">ENTER</span> para selecionar
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slideshow-overlay/20 rounded-lg">
                <p className="text-slideshow-text/70 mb-2">Link direto para TV:</p>
                <code className="text-primary font-mono bg-slideshow-overlay/30 px-3 py-1 rounded">
                  {window.location.origin}/tv
                </code>
              </div>
              <div className="p-4 bg-slideshow-overlay/20 rounded-lg">
                <p className="text-slideshow-text/70 mb-2">Painel administrativo:</p>
                <code className="text-accent font-mono bg-slideshow-overlay/30 px-3 py-1 rounded">
                  {window.location.origin}/dashboard
                </code>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;