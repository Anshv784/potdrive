"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

const CELL = 56;
// Grid cells that light up now and then, like blocks being written. Fixed so SSR and client agree.
const LIT: [number, number, number][] = [
  [-7, 1, 0.2],
  [-5, 3, 2.6],
  [-3, 0, 5.1],
  [-2, 4, 1.4],
  [0, 2, 3.8],
  [1, 5, 6.2],
  [2, 1, 0.9],
  [4, 3, 4.4],
  [5, 0, 2.1],
  [6, 4, 5.6],
  [8, 2, 3.2],
  [-8, 4, 4.9],
  [-6, 6, 1.8],
  [3, 6, 0.4],
];

// Faint block grid behind the hero, with a glow that follows the pointer.
export function HeroBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(50);
  const y = useMotionValue(30);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });
  const glow = useMotionTemplate`radial-gradient(520px circle at ${sx}% ${sy}%, var(--glow), transparent 70%)`;

  useEffect(() => {
    if (reduce) return;
    const host = ref.current?.parentElement;
    if (!host) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = host.getBoundingClientRect();
      x.set(((e.clientX - r.left) / r.width) * 100);
      y.set(((e.clientY - r.top) / r.height) * 100);
    };
    host.addEventListener("pointermove", move);
    return () => host.removeEventListener("pointermove", move);
  }, [reduce, x, y]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 text-label opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: `${CELL}px ${CELL}px`,
          backgroundPosition: "center top",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, #000 25%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, #000 25%, transparent 75%)",
        }}
      >
        {LIT.map(([cx, cy, d], i) => (
          <span
            key={i}
            className="hero-cell absolute rounded-[3px] bg-accent"
            style={{
              width: CELL - 1,
              height: CELL - 1,
              left: `calc(50% + ${cx * CELL - CELL / 2 + 1}px)`,
              top: cy * CELL + 1,
              animationDelay: `${d}s`,
            }}
          />
        ))}
      </div>
      {!reduce && <motion.div className="absolute inset-0" style={{ background: glow }} />}
    </div>
  );
}

// Lays the demo card back in perspective and stands it up as it scrolls into view.
export function TiltIn({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 35%"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const rotateX = useTransform(p, [0, 1], [16, 0]);
  const scale = useTransform(p, [0, 1], [0.94, 1]);
  return (
    <div ref={ref} style={{ perspective: 1400 }}>
      <motion.div style={reduce ? undefined : { rotateX, scale, transformOrigin: "50% 0%" }}>{children}</motion.div>
    </div>
  );
}
