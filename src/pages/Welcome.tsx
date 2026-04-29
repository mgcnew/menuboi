import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tv, Settings, Play } from "lucide-react";
import { useRemoteNavigation, isSmartTV } from "@/hooks/use-remote-navigation";

type Option = {
  id: "tv" | "admin";
  title: string;
  subtitle: string;
  icon: typeof Tv;
  route: string;
  accent: string; // tailwind ring/border color when focused
};

const OPTIONS: Option[] = [
  {
    id: "tv",
    title: "Iniciar TV",
    subtitle: "Exibir slideshow em tela cheia",
    icon: Play,
    route: "/tv",
    accent: "ring-blue-400 bg-blue-600",
  },
  {
    id: "admin",
    title: "Painel Admin",
    subtitle: "Gerenciar conteúdo",
    icon: Settings,
    route: "/dashboard",
    accent: "ring-amber-400 bg-amber-600",
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const tvMode = useRef(isSmartTV()).current;

  // Mark body as tv-mode for the duration of this page when on a TV
  useEffect(() => {
    if (tvMode) document.body.classList.add("tv-mode");
  }, [tvMode]);

  useRemoteNavigation(
    {
      onLeft: () => setFocusedIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length),
      onRight: () => setFocusedIndex((i) => (i + 1) % OPTIONS.length),
      onUp: () => setFocusedIndex((i) => (i - 1 + OPTIONS.length) % OPTIONS.length),
      onDown: () => setFocusedIndex((i) => (i + 1) % OPTIONS.length),
      onSelect: () => navigate(OPTIONS[focusedIndex].route),
    },
    [focusedIndex, navigate]
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl lg:text-7xl font-bold text-white mb-4 text-center">
        Menu Board Digital
      </h1>
      <p className="text-xl lg:text-2xl text-slate-400 mb-16 text-center">
        Use ← → para navegar e OK / ENTER para selecionar
      </p>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-4xl">
        {OPTIONS.map((opt, index) => {
          const Icon = opt.icon;
          const isFocused = focusedIndex === index;
          return (
            <button
              key={opt.id}
              onClick={() => navigate(opt.route)}
              onMouseEnter={() => !tvMode && setFocusedIndex(index)}
              className={`tv-focusable ${isFocused ? "tv-focused" : ""} flex-1 p-8 lg:p-12 rounded-2xl ${
                isFocused ? opt.accent : "bg-slate-800"
              }`}
            >
              <Icon
                className={`h-16 w-16 lg:h-24 lg:w-24 mx-auto mb-6 ${
                  isFocused ? "text-white" : opt.id === "tv" ? "text-blue-400" : "text-amber-400"
                }`}
              />
              <h2 className="text-2xl lg:text-4xl font-bold text-white mb-3">{opt.title}</h2>
              <p className={`text-lg lg:text-xl ${isFocused ? "text-white/90" : "text-slate-400"}`}>
                {opt.subtitle}
              </p>
              {isFocused && (
                <p className="text-white mt-4 text-lg font-medium">✓ Pressione OK</p>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-slate-500 text-sm mt-12 text-center">
        Controle remoto: setas para mover • OK para selecionar • Voltar para sair
      </p>
    </div>
  );
};

export default Welcome;
