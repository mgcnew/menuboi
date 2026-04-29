import { useEffect } from "react";

/**
 * Normalized remote-control actions.
 * Works on Fire TV, Android TV, LG WebOS, Samsung Tizen, Sony BRAVIA and regular keyboards.
 */
export type RemoteAction = "up" | "down" | "left" | "right" | "select" | "back" | "playpause";

interface RemoteHandlers {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onSelect?: () => void;
  onBack?: () => void;
  onPlayPause?: () => void;
}

/**
 * Maps a KeyboardEvent to a normalized RemoteAction.
 * Covers TV-specific keyCodes that browsers don't standardize.
 */
function mapKeyToAction(e: KeyboardEvent): RemoteAction | null {
  // Standard arrows
  if (e.key === "ArrowUp") return "up";
  if (e.key === "ArrowDown") return "down";
  if (e.key === "ArrowLeft") return "left";
  if (e.key === "ArrowRight") return "right";

  // Select / OK button
  if (e.key === "Enter" || e.key === " ") return "select";
  // Fire TV "select" sometimes 23, Android TV DPAD_CENTER 23
  if (e.keyCode === 23) return "select";

  // Back button
  if (e.key === "Escape" || e.key === "Backspace" || e.key === "GoBack") return "back";
  // LG WebOS back = 461, Fire TV back = 4 / 8, Tizen back = 10009
  if (e.keyCode === 461 || e.keyCode === 10009 || e.keyCode === 4 || e.keyCode === 8) return "back";

  // Media keys
  if (e.key === "MediaPlayPause" || e.key === "MediaPlay" || e.key === "MediaPause") return "playpause";
  if (e.keyCode === 415 || e.keyCode === 19 || e.keyCode === 179) return "playpause";

  return null;
}

/**
 * Hook for TV remote control navigation.
 * Pass only the handlers you care about. Unhandled keys pass through.
 */
export function useRemoteNavigation(handlers: RemoteHandlers, deps: any[] = []) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const action = mapKeyToAction(e);
      if (!action) return;

      const fn = {
        up: handlers.onUp,
        down: handlers.onDown,
        left: handlers.onLeft,
        right: handlers.onRight,
        select: handlers.onSelect,
        back: handlers.onBack,
        playpause: handlers.onPlayPause,
      }[action];

      if (fn) {
        e.preventDefault();
        e.stopPropagation();
        fn();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Detects whether the current device is a Smart TV based on user-agent.
 * Returns true for Fire TV, Android TV, LG WebOS, Samsung Tizen, Sony BRAVIA, etc.
 * Also returns true if URL contains ?tv=1 (manual override).
 */
export function isSmartTV(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("tv") === "1") return true;
  const ua = navigator.userAgent;
  return /SmartTV|SMART-TV|Tizen|WebOS|BRAVIA|AFT[A-Z]|GoogleTV|Android TV|HbbTV|NetCast|Viera|Roku|AppleTV/i.test(ua);
}
