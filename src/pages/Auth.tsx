import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";


const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const pendingCode = sessionStorage.getItem("pending_tv_code");
        if (pendingCode) {
          navigate("/link", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        const pendingCode = sessionStorage.getItem("pending_tv_code");
        if (pendingCode) {
          navigate("/link", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Acesso ao Painel</CardTitle>
          <CardDescription>Entre para gerenciar o menu board</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email-in">Email</Label>
              <Input id="email-in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass-in">Senha</Label>
              <Input id="pass-in" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Cadastro disponível somente por convite do administrador.
            </p>
          </form>
        </CardContent>

      </Card>
    </div>
  );
};

export default Auth;
