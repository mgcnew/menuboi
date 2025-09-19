import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Tv, 
  Play, 
  Settings, 
  ArrowLeft, 
  Clock, 
  Monitor,
  CheckCircle,
  AlertCircle,
  QrCode
} from "lucide-react";
import { MenuImage } from "./Dashboard";
import { supabase } from "@/integrations/supabase/client";

const TVPreparation = () => {
  const [images, setImages] = useState<MenuImage[]>([]);
  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadImagesAndSettings();
  }, []);

  const loadImagesAndSettings = async () => {
    // First try localStorage 
    const savedImages = localStorage.getItem('menuboard-images');

    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages);
        setImages(parsedImages);
        setIsReady(parsedImages.length > 0);
        return; // If localStorage has images, use them
      } catch (e) {
        console.error('Error loading images from localStorage:', e);
      }
    }

    // Fallback to Supabase if localStorage is empty
    try {
      const { data, error } = await supabase
        .from('menu_images')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error loading images from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const formattedImages = data.map((img: any) => ({
          id: img.id,
          url: `https://rsyqznvjpmwoibgohptz.supabase.co/storage/v1/object/public/menu-images/${img.file_path}`,
          name: img.name,
          order: img.order_index,
          uploadedAt: new Date(img.created_at),
          displayTime: img.display_time,
          transitionType: img.transition_type
        }));
        setImages(formattedImages);
        setIsReady(true);
        // Save to localStorage for future use
        localStorage.setItem('menuboard-images', JSON.stringify(formattedImages));
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
    }
  };


  const startFullscreenSlideshow = () => {
    window.location.href = '/slideshow';
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/" 
            className="flex items-center text-slideshow-text/70 hover:text-slideshow-text transition-smooth"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar à página inicial
          </Link>
          
          <Link to="/dashboard">
            <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Settings className="mr-2 h-4 w-4" />
              Painel Admin
            </Button>
          </Link>
        </div>

        {/* Main Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Tv className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-slideshow-text mb-3">
            Configuração para TV
          </h1>
          <p className="text-xl text-slideshow-text/70 max-w-2xl mx-auto">
            Configure as últimas preferências antes de iniciar o slideshow em tela cheia
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Status and Quick Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="bg-card/10 backdrop-blur-sm border-primary/20 p-6">
              <h2 className="text-xl font-semibold text-slideshow-text mb-6 flex items-center">
                <Monitor className="mr-2 h-5 w-5" />
                Status do Sistema
              </h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center p-4 bg-slideshow-overlay/20 rounded-lg">
                  {images.length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
                  )}
                  <div>
                    <p className="font-medium text-slideshow-text">
                      {images.length} {images.length === 1 ? 'Imagem' : 'Imagens'}
                    </p>
                    <p className="text-sm text-slideshow-text/60">
                      {images.length > 0 ? 'Carregadas e prontas' : 'Nenhuma imagem encontrada'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center p-4 bg-slideshow-overlay/20 rounded-lg">
                  <Clock className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <p className="font-medium text-slideshow-text">Individual</p>
                    <p className="text-sm text-slideshow-text/60">Tempo configurado por imagem</p>
                  </div>
                </div>
              </div>

              {images.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 font-medium mb-2">⚠️ Nenhuma imagem carregada</p>
                  <p className="text-slideshow-text/70 text-sm">
                    Você precisa adicionar imagens no painel administrativo antes de iniciar o slideshow.
                  </p>
                  <Link to="/dashboard" className="inline-block mt-3">
                    <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900">
                      Ir para o Painel Admin
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Image Info */}
            <Card className="bg-card/10 backdrop-blur-sm border-primary/20 p-6">
              <h2 className="text-xl font-semibold text-slideshow-text mb-6 flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Configuração das Imagens
              </h2>
              
              <div className="space-y-4">
                <p className="text-slideshow-text/70 text-sm">
                  O tempo de exibição é configurado individualmente para cada imagem no painel administrativo.
                </p>
                
                {images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slideshow-text">Resumo dos tempos:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {images.map((img, index) => (
                        <div key={img.id} className="flex justify-between text-xs text-slideshow-text/60 bg-slideshow-overlay/10 p-2 rounded">
                          <span className="truncate mr-2">{img.name}</span>
                          <span>{img.displayTime}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Launch Panel */}
          <div className="space-y-6">
            {/* Start Slideshow */}
            <Card className="bg-card/10 backdrop-blur-sm border-primary/20 p-6 text-center">
              <h2 className="text-xl font-semibold text-slideshow-text mb-4">
                Iniciar Slideshow
              </h2>
              
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="h-8 w-8 text-primary-foreground" />
                </div>
                
                {isReady ? (
                  <p className="text-slideshow-text/70 text-sm mb-4">
                    Tudo pronto! O slideshow será iniciado em tela cheia.
                  </p>
                ) : (
                  <p className="text-yellow-300 text-sm mb-4">
                    Adicione pelo menos uma imagem para continuar.
                  </p>
                )}
              </div>
              
              <Button
                onClick={startFullscreenSlideshow}
                disabled={!isReady}
                className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground font-semibold py-6 text-lg mb-4"
              >
                <Play className="mr-2 h-5 w-5" />
                Iniciar em Tela Cheia
              </Button>
              
              <div className="text-xs text-slideshow-text/50 space-y-1">
                <p>• Use as setas do teclado para navegar</p>
                <p>• Pressione 'P' para pausar/continuar</p>
                <p>• Pressione 'ESC' para mostrar controles</p>
              </div>
            </Card>

            {/* Share Links */}
            <Card className="bg-card/10 backdrop-blur-sm border-primary/20 p-6">
              <h2 className="text-lg font-semibold text-slideshow-text mb-4 flex items-center">
                <QrCode className="mr-2 h-4 w-4" />
                Links de Acesso
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slideshow-text/60 mb-1">TV/Slideshow direto:</p>
                  <code className="block text-xs font-mono bg-slideshow-overlay/30 p-2 rounded text-primary break-all">
                    {window.location.origin}/tv
                  </code>
                </div>
                
                <div>
                  <p className="text-xs text-slideshow-text/60 mb-1">Painel admin:</p>
                  <code className="block text-xs font-mono bg-slideshow-overlay/30 p-2 rounded text-accent break-all">
                    {window.location.origin}/dashboard
                  </code>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TVPreparation;