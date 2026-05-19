import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Monitor, Smartphone, Loader2, CheckCircle2 } from "lucide-react";

const LinkTV = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Ensure user is logged in before they can link a TV
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsCheckingAuth(false);
      if (!session) {
        toast.error("Você precisa estar logado para conectar uma TV.");
        // Save the code in session storage to use after login
        if (code) sessionStorage.setItem("pending_tv_code", code);
        navigate("/auth", { replace: true });
      } else {
        const pendingCode = sessionStorage.getItem("pending_tv_code");
        if (pendingCode && !code) {
          setCode(pendingCode);
          sessionStorage.removeItem("pending_tv_code");
        }
      }
    });
  }, [navigate, code]);

  const handleLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code || code.length < 6) {
      toast.error("Digite o código completo de 6 caracteres.");
      return;
    }

    setStatus("loading");
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      const formattedCode = code.toUpperCase().trim();

      const { data, error } = await supabase.functions.invoke("tv-pair-claim", {
        body: {
          code: formattedCode,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      });

      if (error || !data?.ok) {
        const msg = data?.error === "code_not_found" ? "Código inválido."
          : data?.error === "code_expired" ? "Código expirado. Gere um novo na TV."
          : data?.error === "already_claimed" ? "Código já foi usado."
          : "Erro ao conectar. Tente novamente.";
        throw new Error(msg);
      }

      setStatus("success");
      toast.success("TV conectada com sucesso!");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Link error:", error);
      toast.error(error.message || "Erro ao conectar. Tente novamente.");
      setStatus("idle");
    }
  };


  // If the user scanned a QR code, automatically trigger link once auth is verified
  useEffect(() => {
    if (!isCheckingAuth && code && searchParams.get("code") && status === "idle") {
      handleLink();
    }
  }, [isCheckingAuth, code, searchParams, status]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center w-24">
              <div className="h-0.5 bg-gray-200 w-full animate-pulse"></div>
            </div>
            <div className="relative z-10 flex gap-12">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
                <Monitor className="w-6 h-6" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Conectar TV</CardTitle>
          <CardDescription>
            Insira o código de 6 dígitos que aparece na tela da sua TV
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === "success" ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h3 className="text-xl font-bold text-gray-900">Sucesso!</h3>
              <p className="text-gray-500">Sua TV foi conectada e o Menu Board vai carregar em instantes.</p>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-6">
              <div className="space-y-2">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EX: A8B39Z"
                  maxLength={6}
                  className="text-center text-3xl tracking-widest font-mono py-8 uppercase"
                  disabled={status === "loading"}
                  autoFocus
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={status === "loading" || code.length < 6}
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Vincular TV"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkTV;
