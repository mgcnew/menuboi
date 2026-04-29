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
  glow: string;
  iconBg: string;
};

const OPTIONS: Option[] = [
  {
    id: "tv",
    title: "Iniciar TV",
    subtitle: "Slideshow em tela cheia",
    icon: Play,
    route: "/tv",
    glow: "0 0 0 2px hsl(217 91% 60%), 0 30px 80px -10px hsl(217 91% 60% / 0.65), 0 0 60px hsl(217 91% 60% / 0.45)",
    iconBg: "from-blue-500 to-blue-700",
  },
  {
    id: "admin",
    title: "Painel Admin",
    subtitle: "Gerenciar conteúdo",
    icon: Settings,
    route: "/dashboard",
    glow: "0 0 0 2px hsl(43 96% 56%), 0 30px 80px -10px hsl(43 96% 56% / 0.6), 0 0 60px hsl(43 96% 56% / 0.4)",
    iconBg: "from-amber-500 to-amber-700",
  },
];

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
};

const Welcome = () => {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const tvMode = useRef(isSmartTV()).current;
  const now = useClock();

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

  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      {/* Cinematic background — animated aurora gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="launcher-aurora-1 absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full opacity-50 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(217 91% 55%) 0%, transparent 70%)" }}
        />
        <div
          className="launcher-aurora-2 absolute -bottom-1/3 -right-1/4 h-[80vh] w-[80vh] rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(280 85% 55%) 0%, transparent 70%)" }}
        />
        <div
          className="launcher-aurora-1 absolute top-1/4 right-1/3 h-[50vh] w-[50vh] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(43 96% 56%) 0%, transparent 70%)" }}
        />
      </div>

      {/* Subtle noise / grid overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Top bar — clock + brand mark */}
      <header className="relative z-10 flex items-center justify-between px-12 pt-10 lg:px-20 lg:pt-12">
        <div className="launcher-fade-in flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/50">
            <Tv className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Menu Board</p>
            <p className="text-base font-semibold tracking-wide">Digital</p>
          </div>
        </div>

        <div className="launcher-fade-in text-right" style={{ animationDelay: "120ms" }}>
          <p className="font-mono text-3xl font-light tabular-nums tracking-tight lg:text-4xl">
            {time}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40 lg:text-sm">
            {date}
          </p>
        </div>
      </header>

      {/* Main stage */}
      <main className="relative z-10 flex flex-col items-center justify-center px-8 pt-12 lg:pt-20">
        <div className="launcher-fade-in mb-3 flex items-center gap-3" style={{ animationDelay: "200ms" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/50">
            Sistema online
          </span>
        </div>

        <h1
          className="launcher-fade-in bg-gradient-to-b from-white to-white/60 bg-clip-text text-center text-6xl font-bold tracking-tight text-transparent lg:text-8xl"
          style={{ animationDelay: "280ms" }}
        >
          Bem-vindo
        </h1>
        <p
          className="launcher-fade-in mt-3 max-w-2xl text-center text-lg font-light text-white/60 lg:text-xl"
          style={{ animationDelay: "360ms" }}
        >
          Escolha como deseja começar
        </p>

        {/* Cards */}
        <div
          className="launcher-fade-in mt-16 grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8"
          style={{ animationDelay: "440ms" }}
        >
          {OPTIONS.map((opt, index) => {
            const Icon = opt.icon;
            const isFocused = focusedIndex === index;
            return (
              <button
                key={opt.id}
                onClick={() => navigate(opt.route)}
                onMouseEnter={() => !tvMode && setFocusedIndex(index)}
                className={`launcher-card group relative overflow-hidden rounded-3xl border p-10 text-left lg:p-12 ${
                  isFocused
                    ? "is-selected border-white/30 bg-white/[0.08] backdrop-blur-2xl"
                    : "border-white/10 bg-white/[0.03] backdrop-blur-xl"
                }`}
                style={isFocused ? { boxShadow: opt.glow } : undefined}
              >
                {/* Inner gradient accent */}
                <div
                  className={`pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br ${opt.iconBg} opacity-0 blur-3xl transition-opacity duration-500 ${
                    isFocused ? "opacity-30" : ""
                  }`}
                />

                <div
                  className={`relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br ${opt.iconBg} shadow-xl lg:h-24 lg:w-24`}
                >
                  <Icon className="h-10 w-10 lg:h-12 lg:w-12" strokeWidth={2} />
                </div>

                <h2 className="relative mt-8 text-3xl font-bold tracking-tight lg:text-5xl">
                  {opt.title}
                </h2>
                <p className="relative mt-2 text-base font-light text-white/55 lg:text-lg">
                  {opt.subtitle}
                </p>

                {/* Bottom indicator line */}
                <div className="relative mt-10 flex items-center justify-between">
                  <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full bg-gradient-to-r ${opt.iconBg} transition-all duration-500 ${
                        isFocused ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                  <span
                    className={`ml-6 text-xs font-medium uppercase tracking-[0.25em] transition-opacity duration-300 ${
                      isFocused ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    Selecionado
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Welcome;
