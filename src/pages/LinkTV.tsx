import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Monitor, Smartphone, Loader2, CheckCircle2, LogIn } from "lucide-react";

const LinkTV = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Inline login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsCheckingAuth(false);
      setIsLoggedIn(!!session);

      // If there was a pending code from a previous redirect, restore it
      if (session) {
        const pendingCode = sessionStorage.getItem("pending_tv_code");
        if (pendingCode && !code) {
          setCode(pendingCode);
          sessionStorage.removeItem("pending_tv_code");
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, [code]);

  // Inline login handler
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoginLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado!");
    }
  };

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

<<<<<<< HEAD

  // If the user scanned a QR code, automatically trigger link once auth is verified
=======
  // If the user scanned a QR code and is already logged in, automatically trigger link
>>>>>>> cbfb6e3 (feat: simplify auth flow - auto-redirect, inline login on /link, remove tv-config)
  useEffect(() => {
    if (!isCheckingAuth && isLoggedIn && code && searchParams.get("code") && status === "idle") {
      handleLink();
    }
  }, [isCheckingAuth, isLoggedIn, code, searchParams, status]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center w-24">
              <div className="h-0.5 bg-muted w-full animate-pulse"></div>
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
            {isLoggedIn 
              ? "Insira o código de 6 dígitos que aparece na tela da sua TV" 
              : "Faça login para vincular sua TV"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === "success" ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <h3 className="text-xl font-bold">Sucesso!</h3>
              <p className="text-muted-foreground">Sua TV foi conectada e o Menu Board vai carregar em instantes.</p>
            </div>
          ) : !isLoggedIn ? (
            /* ─── Inline Login ─── */
            <form onSubmit={handleInlineLogin} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-2">
                <LogIn className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Faça login para conectar esta TV à sua conta.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-email">Email</Label>
                <Input 
                  id="link-email" 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link-password">Senha</Label>
                <Input 
                  id="link-password" 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loginLoading}>
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Entrar e Conectar TV
                  </>
                )}
              </Button>
            </form>
          ) : (
            /* ─── Code Input ─── */
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
