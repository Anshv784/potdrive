"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Fades and lifts its children in the first time they scroll into view.
export function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

// A grid whose direct items come in one after another.
export function Stagger({ children, className, step = 0.07 }: { children: ReactNode[]; className?: string; step?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: step }}
    >
      {children.map((c, i) => (
        <motion.div
          key={i}
          className="h-full"
          variants={{ hidden: { opacity: 0, y: 28, scale: 0.98 }, shown: { opacity: 1, y: 0, scale: 1 } }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {c}
        </motion.div>
      ))}
    </motion.div>
  );
}

// A card that leans toward the pointer and lights up under it.
export function TiltCard({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 220, damping: 22 });
  const glow = useTransform([px, py] as const, ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, var(--glow), transparent 60%)`);
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      ref={ref}
      className={`relative h-full [transform-style:preserve-3d] ${className ?? ""}`}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        px.set(0.5);
        py.set(0.5);
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{ background: glow, opacity: hover ? 1 : 0 }}
      />
      {children}
    </motion.div>
  );
}

// Counts up to a number when it scrolls into view.
export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!seen || reduce || to === 0) return;
    const c = animate(0, to, { duration: 1.1, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [seen, reduce, to]);
  return (
    <span ref={ref} className={className}>
      {n}
    </span>
  );
}
