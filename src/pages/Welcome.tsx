import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Settings } from "lucide-react";
import { useRemoteNavigation, isSmartTV } from "@/hooks/use-remote-navigation";
import logo from "@/assets/logo-novo-boi.png";

type Option = {
  id: "tv" | "admin";
  title: string;
  icon: typeof Play;
  route: string;
};

const OPTIONS: Option[] = [
  { id: "tv", title: "Iniciar TV", icon: Play, route: "/tv" },
  { id: "admin", title: "Painel Admin", icon: Settings, route: "/dashboard" },
];

const Welcome = () => {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const tvMode = useRef(isSmartTV()).current;

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-10">
      <img
        src={logo}
        alt="Novo Boi João Dias"
        className="w-auto object-contain mb-[6vmin]"
        style={{ height: "clamp(120px, 26vmin, 360px)" }}
      />

      <div
        className="flex flex-wrap items-center justify-center"
        style={{ gap: "clamp(16px, 3vmin, 36px)" }}
      >
        {OPTIONS.map((opt, index) => {
          const Icon = opt.icon;
          const isFocused = focusedIndex === index;
          return (
            <button
              key={opt.id}
              onClick={() => navigate(opt.route)}
              onMouseEnter={() => !tvMode && setFocusedIndex(index)}
              className={`flex flex-col items-center justify-center rounded-2xl bg-card text-card-foreground transition-transform duration-150 ${
                isFocused
                  ? "border-[3px] border-brand scale-[1.03] shadow-[0_8px_24px_-8px_hsl(var(--brand)/0.5)]"
                  : "border-[3px] border-border"
              }`}
              style={{
                width: "clamp(180px, 22vmin, 300px)",
                height: "clamp(180px, 22vmin, 300px)",
                gap: "clamp(8px, 1.5vmin, 16px)",
              }}
            >
              <Icon
                className="text-brand"
                strokeWidth={2.25}
                style={{ width: "clamp(40px, 7vmin, 80px)", height: "clamp(40px, 7vmin, 80px)" }}
              />
              <span
                className="font-semibold tracking-tight"
                style={{ fontSize: "clamp(16px, 2.2vmin, 26px)" }}
              >
                {opt.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Welcome;
