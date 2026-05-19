import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { Monitor, Smartphone, Loader2 } from "lucide-react";

const TVStart = () => {
  const navigate = useNavigate();
  const [pairingCode, setPairingCode] = useState("");
  const [status, setStatus] = useState<"checking" | "pairing" | "success">("checking");

  useEffect(() => {
    let cancelled = false;
    let pollInterval: number | undefined;
    let pollToken: string | null = null;

    const start = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/slideshow", { replace: true });
        return;
      }

      if (cancelled) return;
      setStatus("pairing");

      const { data, error } = await supabase.functions.invoke("tv-pair-create");
      if (error || !data?.code) {
        console.error("Pairing create error:", error);
        return;
      }
      pollToken = data.poll_token;
      setPairingCode(data.code);

      pollInterval = window.setInterval(async () => {
        if (!pollToken) return;
        const { data: pollData } = await supabase.functions.invoke("tv-pair-poll", {
          body: { poll_token: pollToken },
        });
        if (!pollData) return;
        if (pollData.status === "claimed" && pollData.access_token && pollData.refresh_token) {
          window.clearInterval(pollInterval);
          setStatus("success");
          const { error: setErr } = await supabase.auth.setSession({
            access_token: pollData.access_token,
            refresh_token: pollData.refresh_token,
          });
          if (!setErr) {
            setTimeout(() => navigate("/slideshow", { replace: true }), 1000);
          } else {
            console.error("Error setting session:", setErr);
            setStatus("pairing");
          }
        } else if (pollData.status === "expired") {
          window.clearInterval(pollInterval);
          // restart pairing
          start();
        }
      }, 2000);
    };

    start();
    return () => {
      cancelled = true;
      if (pollInterval) window.clearInterval(pollInterval);
    };
  }, [navigate]);


  if (status === "checking") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-white animate-spin opacity-50" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4">
          <Monitor className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold">TV Conectada!</h1>
        <p className="text-gray-400">Iniciando o slideshow...</p>
      </div>
    );
  }

  const linkUrl = `${window.location.origin}/link?code=${pairingCode}`;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Instructions */}
        <div className="text-white space-y-8">
          <div className="flex items-center gap-4">
            <Monitor className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold">Conectar TV</h1>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold flex-shrink-0 mt-1">1</div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Pegue seu celular</h3>
                <p className="text-gray-400">Acesse o endereço abaixo no navegador do seu celular ou computador.</p>
                <div className="mt-2 inline-block px-4 py-2 bg-white/10 rounded-lg text-xl font-mono text-primary">
                  {window.location.host}/link
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold flex-shrink-0 mt-1">2</div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Digite o código</h3>
                <p className="text-gray-400">Insira este código na tela de conexão para vincular esta TV.</p>
                <div className="mt-3 text-5xl font-mono font-bold tracking-widest text-white">
                  {pairingCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: QR Code */}
        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center">
          <Smartphone className="w-10 h-10 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-white mb-6">Ou escaneie o QR Code</h3>
          
          <QRCodeDisplay 
            url={linkUrl} 
            title="Acesso Automático" 
            compact 
          />
          <p className="mt-6 text-sm text-gray-400">
            Aponte a câmera do seu celular para fazer login automaticamente.
          </p>
        </div>

      </div>
    </div>
  );
};

export default TVStart;
