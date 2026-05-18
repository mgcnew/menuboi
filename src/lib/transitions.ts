import { TransitionType } from "@/types/slideshow";

type Keyframe = Record<string, string | number>;

const TRANSITIONS: Record<TransitionType, { enter: Keyframe[]; exit: Keyframe[] }> = {
  fade: {
    enter: [{ opacity: 0 }, { opacity: 1 }],
    exit:  [{ opacity: 1 }, { opacity: 0 }],
  },
  crossfade: {
    enter: [{ opacity: 0 }, { opacity: 1 }],
    exit:  [{ opacity: 1 }, { opacity: 0 }],
  },
  "slide-left": {
    enter: [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }],
    exit:  [{ transform: "translateX(0)" }, { transform: "translateX(-100%)" }],
  },
  "slide-right": {
    enter: [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
    exit:  [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }],
  },
  "slide-up": {
    enter: [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
    exit:  [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
  },
  "slide-down": {
    enter: [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }],
    exit:  [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }],
  },
  "zoom-in": {
    enter: [{ transform: "scale(1.15)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    exit:  [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.95)", opacity: 0 }],
  },
  "zoom-out": {
    enter: [{ transform: "scale(0.85)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    exit:  [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.05)", opacity: 0 }],
  },
  blur: {
    enter: [{ filter: "blur(20px)", opacity: 0 }, { filter: "blur(0)", opacity: 1 }],
    exit:  [{ filter: "blur(0)", opacity: 1 }, { filter: "blur(20px)", opacity: 0 }],
  },
  "ken-burns": {
    enter: [{ transform: "scale(1.08)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
    exit:  [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.04)", opacity: 0 }],
  },
  "wipe-left": {
    enter: [
      { clipPath: "inset(0 0 0 100%)", opacity: 1 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ],
    exit: [
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
      { clipPath: "inset(0 100% 0 0)", opacity: 1 },
    ],
  },
  "wipe-right": {
    enter: [
      { clipPath: "inset(0 100% 0 0)", opacity: 1 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ],
    exit: [
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
      { clipPath: "inset(0 0 0 100%)", opacity: 1 },
    ],
  },
  flip: {
    enter: [
      { transform: "perspective(1200px) rotateY(90deg)", opacity: 0 },
      { transform: "perspective(1200px) rotateY(0deg)", opacity: 1 },
    ],
    exit: [
      { transform: "perspective(1200px) rotateY(0deg)", opacity: 1 },
      { transform: "perspective(1200px) rotateY(-90deg)", opacity: 0 },
    ],
  },
};

const DURATION = 700;

export const playTransition = (
  incomingEl: HTMLElement | null,
  outgoingEl: HTMLElement | null,
  type: TransitionType,
) => {
  const cfg = TRANSITIONS[type] ?? TRANSITIONS.fade;
  const options: KeyframeAnimationOptions = {
    duration: DURATION,
    easing: "ease-in-out",
    fill: "forwards",
  };
  try {
    incomingEl?.animate(cfg.enter, options);
    outgoingEl?.animate(cfg.exit, options);
  } catch (e) {
    // Fallback: ensure final visibility
    if (incomingEl) incomingEl.style.opacity = "1";
    if (outgoingEl) outgoingEl.style.opacity = "0";
  }
};

export const TRANSITION_DURATION_MS = DURATION;
