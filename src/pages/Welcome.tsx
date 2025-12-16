import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tv, Settings } from "lucide-react";

const Welcome = () => {
  const [selected, setSelected] = useState<"tv" | "admin">("tv");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected("tv");
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected("admin");
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        navigate(selected === "tv" ? "/tv" : "/dashboard");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selected, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      {/* Logo */}
      <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 text-center">
        Menu Board Digital
      </h1>
      <p className="text-xl lg:text-2xl text-slate-400 mb-16">
        Use ← → para navegar e ENTER para selecionar
      </p>

      {/* Options */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-4xl">
        {/* TV Mode */}
        <button
          onClick={() => navigate("/tv")}
          onFocus={() => setSelected("tv")}
          onMouseEnter={() => setSelected("tv")}
          className={`flex-1 p-8 lg:p-12 rounded-2xl transition-all duration-300 ${
            selected === "tv"
              ? "bg-blue-600 ring-4 ring-blue-400 scale-105"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          <Tv className={`h-16 w-16 lg:h-24 lg:w-24 mx-auto mb-6 ${
            selected === "tv" ? "text-white" : "text-blue-400"
          }`} />
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3">
            Modo TV
          </h2>
          <p className={`text-lg lg:text-xl ${
            selected === "tv" ? "text-blue-100" : "text-slate-400"
          }`}>
            Exibição em tela cheia
          </p>
          {selected === "tv" && (
            <p className="text-blue-200 mt-4 text-lg font-medium">
              ✓ Pressione ENTER
            </p>
          )}
        </button>

        {/* Admin Mode */}
        <button
          onClick={() => navigate("/dashboard")}
          onFocus={() => setSelected("admin")}
          onMouseEnter={() => setSelected("admin")}
          className={`flex-1 p-8 lg:p-12 rounded-2xl transition-all duration-300 ${
            selected === "admin"
              ? "bg-amber-600 ring-4 ring-amber-400 scale-105"
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          <Settings className={`h-16 w-16 lg:h-24 lg:w-24 mx-auto mb-6 ${
            selected === "admin" ? "text-white" : "text-amber-400"
          }`} />
          <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3">
            Painel Admin
          </h2>
          <p className={`text-lg lg:text-xl ${
            selected === "admin" ? "text-amber-100" : "text-slate-400"
          }`}>
            Gerenciar conteúdo
          </p>
          {selected === "admin" && (
            <p className="text-amber-200 mt-4 text-lg font-medium">
              ✓ Pressione ENTER
            </p>
          )}
        </button>
      </div>
    </div>
  );
};

export default Welcome;
