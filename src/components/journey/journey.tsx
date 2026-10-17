"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useResolvedTheme } from "@/lib/theme";
import type { Palette } from "./scene";

const Scene = dynamic(() => import("./scene"), { ssr: false });

const STAGES = [
  {
    n: "01",
    title: "It starts as one file.",
    body: "A PDF, a photo, a whole website. Nothing has left your device yet.",
    tech: "File · 3.4 MiB",
  },
  {
    n: "02",
    title: "Cut where the content says.",
    body: "FastCDC finds chunk boundaries in the bytes themselves, so an edit only changes the chunks around it.",
    tech: "FastCDC · 256 KiB – 1 MiB",
  },
  {
    n: "03",
    title: "Hashed, then checked against the chain.",
    body: "Each chunk gets a blake2b-256 CID. Two of these are already on Portaldot, so they are linked, not paid for again.",
    tech: "CIDv1 · blake2b-256 · dedup",
  },
  {
    n: "04",
    title: "Stored by Portaldot itself.",
    body: "One signature. An upload key writes each new chunk into TransactionStorage, block after block.",
    tech: "transactionStorage.store × 5",
  },
  {
    n: "05",
    title: "Proven, block after block.",
    body: "Validators must keep proving they hold random pieces of what was stored, or their blocks are rejected.",
    tech: "checkProof · 100,800 blocks",
  },
  {
    n: "06",
    title: "Read anywhere. Verified everywhere.",
    body: "Any reader pulls the chunks back over bitswap and re-hashes every one before the file reassembles.",
    tech: "bitswap_v1_get → re-hash ✓",
  },
];
const CUTS = [0.14, 0.3, 0.46, 0.66, 0.82];
const STARTS = [0, ...CUTS];
const ENDS = [...CUTS, 1];
const EASE = [0.22, 1, 0.36, 1] as const;

// One segment of the rail: fills continuously with scroll, and jumps to its step on click.
function Step({
  i,
  progress,
  stage,
  onGo,
}: {
  i: number;
  progress: MotionValue<number>;
  stage: number;
  onGo: (i: number) => void;
}) {
  const width = useTransform(progress, [STARTS[i], ENDS[i]], ["0%", "100%"]);
  const on = i === stage;
  return (
    <li className="flex-1">
      <button
        onClick={() => onGo(i)}
        aria-label={`Step ${i + 1}: ${STAGES[i].title}`}
        aria-current={on ? "step" : undefined}
        title={STAGES[i].title}
        className="group block w-full py-2"
      >
        <span
          className={`block overflow-hidden rounded-full bg-fill transition-[height] duration-300 ${on ? "h-1.5" : "h-1 group-hover:h-1.5"}`}
        >
          <motion.span
            className={`block h-full rounded-full bg-accent ${on ? "shadow-[0_0_12px_var(--accent)]" : ""}`}
            style={{ width }}
          />
        </span>
      </button>
    </li>
  );
}

const PALETTES: Record<"light" | "dark", Palette> = {
  light: { paper: "#ffffff", edge: "#c7c7d1", accent: "#4f46e5", green: "#34c759", glass: "#c7d2fe", bg: "#ffffff" },
  dark: { paper: "#24242a", edge: "#4a4a56", accent: "#818cf8", green: "#30d158", glass: "#3730a3", bg: "#000000" },
};

export function Journey() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const [stage, setStage] = useState(0);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const theme = useResolvedTheme();

  useMotionValueEvent(scrollYProgress, "change", (p) => setStage(CUTS.filter((c) => p >= c).length));

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (STARTS[i] + (ENDS[i] - STARTS[i]) * 0.45) * run, behavior: reduced ? "auto" : "smooth" });
  };

  const s = STAGES[stage];
  return (
    <section ref={ref} className="relative h-[560vh] bg-bg-2" aria-label="How a file travels through PotDrive">
      <div className="sticky top-12 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden lg:flex-row">
        {/* caption */}
        <div className="relative z-10 flex shrink-0 flex-col justify-end px-6 pb-6 pt-8 lg:w-[38%] lg:justify-center lg:px-14 lg:pb-0">
          <p className="eyebrow text-accent">The journey of a file</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="mt-4 font-mono text-[13px] text-label-3">{s.n} / 06</div>
              <h2 className="headline mt-2 text-[30px] sm:text-[40px] lg:text-[46px]">
                {s.title.split(" ").map((w, k) => (
                  <motion.span
                    key={k}
                    className="inline-block"
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.45, delay: k * 0.045, ease: EASE }}
                  >
                    {w}&nbsp;
                  </motion.span>
                ))}
              </h2>
              <motion.p
                className="mt-4 max-w-md text-[17px] text-label-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                {s.body}
              </motion.p>
              <motion.code
                className="mt-5 inline-block rounded-full bg-surface px-3 py-1.5 font-mono text-[12px] text-accent ring-1 ring-sep"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.25, ease: EASE }}
              >
                {s.tech}
              </motion.code>
            </motion.div>
          </AnimatePresence>
          {/* progress rail */}
          <ol className="mt-7 flex gap-2" aria-label="Steps">
            {STAGES.map((st, i) => (
              <Step key={st.n} i={i} progress={scrollYProgress} stage={stage} onGo={go} />
            ))}
          </ol>
          <AnimatePresence>
            {stage === 0 && (
              <motion.div
                className="mt-4 flex items-center gap-2 text-[13px] text-label-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
                  ↓
                </motion.span>
                Scroll to follow it
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* scene */}
        <div className="relative min-h-0 flex-1">
          {reduced ? (
            <div className="grid h-full place-items-center p-10 text-center text-[15px] text-label-2">
              Motion is reduced on this device. Scroll to read each step.
            </div>
          ) : (
            <Scene progress={progress} palette={PALETTES[theme]} active={active} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-2 to-transparent" />
        </div>
      </div>
    </section>
  );
}
