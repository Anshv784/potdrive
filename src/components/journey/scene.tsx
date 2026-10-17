"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Edges, RoundedBox, type EdgesRef } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import * as THREE from "three";

// The life of a file on Portaldot, driven by scroll progress p ∈ [0, 1].
// Every transform is a pure function of p, so scrolling back rewinds exactly.
export const STAGES = [0, 0.14, 0.3, 0.46, 0.66, 0.82, 1] as const;

const WIDTHS = [0.13, 0.17, 0.11, 0.16, 0.14, 0.15, 0.14]; // FastCDC: uneven, content-defined
const N = WIDTHS.length;
const DEDUP = new Set([2, 5]); // already on chain
const SLAB = { w: 4.2, h: 5.2, d: 0.26 };
const CUBE = 0.72;
const BLOCKS = 5;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const slabX = (() => {
  let acc = -SLAB.w / 2;
  return WIDTHS.map((w) => {
    const x = acc + (w * SLAB.w) / 2;
    acc += w * SLAB.w;
    return x;
  });
})();
const rowX = (i: number) => (i - (N - 1) / 2) * 1.05;
const fresh = [...Array(N).keys()].filter((i) => !DEDUP.has(i));
const blockX = (j: number) => (j - (BLOCKS - 1) / 2) * 1.6;

// One page of a document, drawn once. Each chunk shows its own vertical slice of it, so the
// pieces still read as "parts of this file" while they travel.
function pageTexture(dark: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 840;
  c.height = 1040;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, dark ? "#2a2a31" : "#ffffff");
  bg.addColorStop(1, dark ? "#202026" : "#f6f6fa");
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  const ink = dark ? "#41414c" : "#dcdce4";
  const strong = dark ? "#9a9aa8" : "#8e8ea0";
  g.fillStyle = strong;
  g.beginPath();
  g.roundRect(70, 80, 420, 34, 8);
  g.fill();
  g.fillStyle = ink;
  g.beginPath();
  g.roundRect(70, 132, 280, 18, 6);
  g.fill();
  // photo: soft sky, sun, two hills
  g.save();
  g.beginPath();
  g.roundRect(70, 190, 700, 300, 18);
  g.clip();
  const sky = g.createLinearGradient(0, 190, 0, 490);
  sky.addColorStop(0, dark ? "#2e2b5f" : "#eef0ff");
  sky.addColorStop(1, dark ? "#1f1d42" : "#dfe3ff");
  g.fillStyle = sky;
  g.fillRect(70, 190, 700, 300);
  g.fillStyle = dark ? "#f5c451" : "#fbbf24";
  g.globalAlpha = dark ? 0.85 : 0.9;
  g.beginPath();
  g.arc(640, 260, 34, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  g.fillStyle = dark ? "#4f46e5" : "#a5b4fc";
  g.beginPath();
  g.moveTo(40, 500);
  g.lineTo(290, 320);
  g.lineTo(430, 420);
  g.lineTo(560, 300);
  g.lineTo(800, 500);
  g.fill();
  g.fillStyle = dark ? "#6366f1" : "#818cf8";
  g.beginPath();
  g.moveTo(240, 500);
  g.lineTo(470, 380);
  g.lineTo(800, 500);
  g.fill();
  g.restore();
  g.fillStyle = ink;
  for (let i = 0; i < 12; i++) {
    g.beginPath();
    g.roundRect(70, 540 + i * 36, i % 4 === 3 ? 430 : 700, 14, 7);
    g.fill();
  }
  g.fillStyle = "#ef4444";
  g.beginPath();
  g.roundRect(650, 70, 120, 56, 14);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "600 32px Inter, system-ui, sans-serif";
  g.textAlign = "center";
  g.fillText("PDF", 710, 110);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export interface Palette {
  paper: string;
  edge: string;
  accent: string;
  green: string;
  glass: string;
  bg: string;
}

// 1 while the file is in one piece (start and end), 0 while it's in chunks.
const wholeness = (p: number) => clamp(1 - ease(seg(p, 0.1, 0.15)) + ease(seg(p, 0.91, 0.95)));

function chunkTarget(i: number, p: number) {
  const s1 = ease(seg(p, 0.14, 0.3));
  const s2 = ease(seg(p, 0.3, 0.46));
  const s3 = seg(p, 0.46, 0.66);
  const s5 = ease(seg(p, 0.82, 0.93));
  const w = WIDTHS[i] * SLAB.w;

  // 0 → 1: the slab splits along its content-defined cuts
  let x = mix(slabX[i] * 1, slabX[i] * 1.55, s1);
  let y = mix(0.5, 0.5 + Math.sin(i * 1.7) * 0.35, s1);
  let z = mix(0, Math.cos(i * 2.1) * 0.4, s1);
  let sx = w;
  let sy = SLAB.h;
  let sz = SLAB.d;
  let ry = mix(0, (i - 3) * 0.08, s1);

  // 2: slices become hashed cubes in a row
  x = mix(x, rowX(i), s2);
  y = mix(y, 1.2, s2);
  z = mix(z, 0, s2);
  sx = mix(sx, CUBE, s2);
  sy = mix(sy, CUBE, s2);
  sz = mix(sz, CUBE, s2);
  ry = mix(ry, 0, s2);

  let opacity = 1;
  let dedup = 0;
  if (DEDUP.has(i)) {
    // already on chain: turn green, drift up and fade
    const d = ease(seg(p, 0.38, 0.5));
    dedup = d;
    y = mix(y, 2.6, d);
    opacity = mix(1, 0.15, ease(seg(p, 0.46, 0.6)));
  } else {
    // 3: fly into the chain, one after another
    const k = fresh.indexOf(i);
    const t = ease(clamp((s3 - k * 0.11) / 0.45));
    x = mix(x, blockX(k), t);
    y = mix(y, -1.9, t);
    const sc = mix(1, 0.62, t);
    sx *= sc;
    sy *= sc;
    sz *= sc;
  }

  // 5: everything (including the deduped blocks) comes back together for the reader
  const fx = slabX[i] + 0;
  x = mix(x, fx, s5);
  y = mix(y, 0.5, s5);
  z = mix(z, 0.6, s5);
  sx = mix(sx, w, s5);
  sy = mix(sy, SLAB.h, s5);
  sz = mix(sz, SLAB.d, s5);
  opacity = mix(opacity, 1, s5);
  return { x, y, z, sx, sy, sz, ry, opacity, dedup: dedup * (1 - s5) };
}

function Chunk({
  i,
  progress,
  palette,
  page,
}: {
  i: number;
  progress: MotionValue<number>;
  palette: Palette;
  page: THREE.Texture;
}) {
  const ref = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const face = useRef<THREE.MeshBasicMaterial>(null);
  const edges = useRef<EdgesRef>(null);
  const slice = useMemo(() => {
    const t = page.clone();
    t.needsUpdate = true;
    t.repeat.set(WIDTHS[i], 1);
    t.offset.set(
      WIDTHS.slice(0, i).reduce((a, b) => a + b, 0),
      0,
    );
    return t;
  }, [page, i]);
  const paper = useMemo(() => new THREE.Color(palette.paper), [palette.paper]);
  const green = useMemo(() => new THREE.Color(palette.green), [palette.green]);
  const accent = useMemo(() => new THREE.Color(palette.accent), [palette.accent]);
  useFrame((state, dt) => {
    const p = progress.get();
    const t = chunkTarget(i, p);
    const g = ref.current!;
    const k = 1 - Math.pow(0.0008, dt); // frame-rate independent damping
    // the whole page stands in for the slices while the file is in one piece
    g.visible = wholeness(p) < 0.999;
    g.position.x += (t.x - g.position.x) * k;
    g.position.y += (t.y - g.position.y) * k + Math.sin(state.clock.elapsedTime * 1.2 + i) * 0.0015;
    g.position.z += (t.z - g.position.z) * k;
    g.scale.x += (t.sx - g.scale.x) * k;
    g.scale.y += (t.sy - g.scale.y) * k;
    g.scale.z += (t.sz - g.scale.z) * k;
    g.rotation.y += (t.ry - g.rotation.y) * k;
    if (mat.current) {
      // 2: a hashing pulse sweeps the row
      const sweep = seg(p, 0.3, 0.46);
      const pulse = sweep > 0 && sweep < 1 ? Math.max(0, 1 - Math.abs(sweep * (N + 2) - 1 - i) * 0.9) : 0;
      const c = paper
        .clone()
        .lerp(green, t.dedup)
        .lerp(accent, pulse * 0.55);
      mat.current.color.copy(c);
      mat.current.emissive.copy(accent).multiplyScalar(pulse * 0.35);
      mat.current.opacity += (t.opacity - mat.current.opacity) * k;
      // seams only show while the file is in pieces
      const apart = ease(seg(p, 0.1, 0.18)) * (1 - ease(seg(p, 0.86, 0.93)));
      const em = edges.current?.material;
      if (em) {
        em.transparent = true;
        em.opacity = apart * mat.current.opacity;
        edges.current!.visible = em.opacity > 0.01;
      }
      if (face.current) {
        face.current.opacity = mat.current.opacity;
        // 6: the reader re-hashes each chunk; a green check sweeps across before the badge lands
        const check = seg(p, 0.84, 0.95);
        const ok = check > 0 && check < 1 ? Math.max(0, 1 - Math.abs(check * (N + 2) - 1 - i) * 0.8) : 0;
        face.current.color
          .set("#ffffff")
          .lerp(green, t.dedup * 0.8)
          .lerp(accent, pulse * 0.4)
          .lerp(green, ok * 0.22);
      }
    }
  });
  return (
    <group ref={ref} position={[slabX[i], 0.5, 0]} scale={[WIDTHS[i] * SLAB.w, SLAB.h, SLAB.d]}>
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial ref={mat} color={palette.paper} roughness={0.55} metalness={0.05} transparent />
        <Edges ref={edges} color={palette.edge} threshold={15} />
      </mesh>
      {/* front face: this chunk's slice of the page */}
      <mesh position={[0, 0, 0.501]}>
        <planeGeometry args={[1.02, 1]} />
        <meshBasicMaterial ref={face} map={slice} toneMapped={false} transparent />
      </mesh>
    </group>
  );
}

function Chain({ progress, palette }: { progress: MotionValue<number>; palette: Palette }) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  useFrame((state, dt) => {
    const p = progress.get();
    const show = ease(seg(p, 0.42, 0.52)) * (1 - ease(seg(p, 0.9, 1)));
    const g = group.current!;
    const k = 1 - Math.pow(0.001, dt);
    g.position.y += (mix(-4.5, -1.9, show) - g.position.y) * k;
    g.visible = show > 0.01;
    const proof = seg(p, 0.66, 0.82);
    mats.current.forEach((m, j) => {
      if (!m) return;
      const wave = Math.max(0, 1 - Math.abs(proof * (BLOCKS + 1) - 0.5 - j) * 1.2);
      m.emissive.set(palette.accent).multiplyScalar(0.12 + wave * 0.6 + Math.sin(state.clock.elapsedTime * 2 + j) * 0.03);
      m.opacity = 0.18 + show * 0.2 + wave * 0.2;
    });
  });
  return (
    <group ref={group} position={[0, -4.5, 0]}>
      {[...Array(BLOCKS).keys()].map((j) => (
        <group key={j} position={[blockX(j), 0, 0]}>
          <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.1} smoothness={4}>
            <meshPhysicalMaterial
              ref={(m) => {
                mats.current[j] = m;
              }}
              color={palette.glass}
              transparent
              opacity={0.3}
              roughness={0.15}
              metalness={0.1}
              clearcoat={1}
            />
          </RoundedBox>
          {j < BLOCKS - 1 && (
            <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
              <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.4} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function Validators({ progress, palette }: { progress: MotionValue<number>; palette: Palette }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const p = progress.get();
    const show = ease(seg(p, 0.64, 0.7)) * (1 - ease(seg(p, 0.82, 0.88)));
    const g = group.current!;
    g.visible = show > 0.01;
    g.scale.setScalar(show);
    g.rotation.y = state.clock.elapsedTime * 0.9;
  });
  return (
    <group ref={group} position={[0, -1.9, 0]}>
      {[0, 1, 2].map((v) => {
        const a = (v / 3) * Math.PI * 2;
        return (
          <mesh key={v} position={[Math.cos(a) * 4.4, 0.4 + v * 0.3, Math.sin(a) * 1.6]}>
            <sphereGeometry args={[0.22, 32, 32]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[4.4, 0.012, 8, 128]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

// Two strokes of a check mark: A(-0.2, 0.02) → B(-0.06, -0.12) → C(0.21, 0.16).
const CHECK: [number, number, number, number][] = (() => {
  const seg2 = (ax: number, ay: number, bx: number, by: number): [number, number, number, number] => [
    (ax + bx) / 2,
    (ay + by) / 2,
    Math.hypot(bx - ax, by - ay) + 0.08,
    Math.atan2(by - ay, bx - ax),
  ];
  return [seg2(-0.2, 0.02, -0.06, -0.12), seg2(-0.06, -0.12, 0.21, 0.16)];
})();

function Verified({ progress, palette }: { progress: MotionValue<number>; palette: Palette }) {
  const ref = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const strokes = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const p = progress.get();
    const s = ease(seg(p, 0.93, 0.98));
    const g = ref.current!;
    g.visible = s > 0.01;
    // a little overshoot, then rest
    const pop = s < 1 ? s * (1 + Math.sin(s * Math.PI) * 0.18) : 1;
    g.scale.setScalar(pop);
    // the check draws itself: short stroke, then long stroke
    const draw = seg(p, 0.95, 1);
    CHECK.forEach(([, , len], n) => {
      const m = strokes.current[n];
      if (!m) return;
      const t = clamp(n === 0 ? draw * 2.5 : (draw - 0.4) * 1.7);
      m.scale.x = Math.max(0.001, t);
      m.position.x = CHECK[n][0] - (Math.cos(CHECK[n][3]) * len * (1 - t)) / 2;
      m.position.y = CHECK[n][1] - (Math.sin(CHECK[n][3]) * len * (1 - t)) / 2;
    });
    // a soft ring keeps breathing out from the badge
    if (halo.current) {
      const w = (state.clock.elapsedTime * 0.6) % 1;
      halo.current.scale.setScalar(1 + w * 0.7);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = (1 - w) * 0.28 * s;
    }
  });
  return (
    <group ref={ref} position={[2.35, 2.55, 0.9]}>
      <mesh ref={halo}>
        <ringGeometry args={[0.55, 0.58, 64]} />
        <meshBasicMaterial color={palette.green} transparent opacity={0.3} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.48, 64]} />
        <meshBasicMaterial color={palette.green} />
      </mesh>
      {CHECK.map(([cx, cy, len, ang], n) => (
        <mesh
          key={n}
          ref={(m) => {
            strokes.current[n] = m;
          }}
          position={[cx, cy, 0.02]}
          rotation={[0, 0, ang]}
        >
          <boxGeometry args={[len, 0.085, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// A soft highlight that glides across the page while it's whole, so it reads as glossy paper.
function sheenTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  // one vertical band, tilted by rotating the UVs; it wraps so it can slide forever
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.46, "rgba(255,255,255,0)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.5)");
  grad.addColorStop(0.54, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.center.set(0.5, 0.5);
  t.rotation = 0.5;
  return t;
}

function Sheen({ progress, strength }: { progress: MotionValue<number>; strength: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => sheenTexture(), []);
  useFrame((state) => {
    const p = progress.get();
    const whole = 1 - ease(seg(p, 0.08, 0.14)) + ease(seg(p, 0.93, 0.99));
    const m = ref.current!;
    m.visible = whole > 0.01;
    const mm = m.material as THREE.MeshBasicMaterial;
    mm.opacity = whole * strength;
    m.position.z = mix(SLAB.d / 2 + 0.02, 0.6 + SLAB.d / 2 + 0.02, ease(seg(p, 0.82, 0.93)));
    mm.map!.offset.x = -((state.clock.elapsedTime * 0.18) % 1.6) + 0.8;
  });
  return (
    <mesh ref={ref} position={[0, 0.5, SLAB.d / 2 + 0.02]}>
      <planeGeometry args={[SLAB.w, SLAB.h]} />
      <meshBasicMaterial map={tex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// While the file is whole, it's one seamless block of paper instead of seven slices.
function WholePage({ progress, page, palette }: { progress: MotionValue<number>; page: THREE.Texture; palette: Palette }) {
  const ref = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: palette.paper, roughness: 0.55, metalness: 0.05, transparent: true });
    const front = new THREE.MeshBasicMaterial({ map: page, toneMapped: false, transparent: true });
    return [side, side, side, side, front, side];
  }, [page, palette.paper]);
  useFrame(() => {
    const p = progress.get();
    const w = wholeness(p);
    const m = ref.current!;
    m.visible = w > 0.001;
    for (const mat of m.material as THREE.Material[]) mat.opacity = w;
    m.position.z = mix(0, 0.6, ease(seg(p, 0.82, 0.93)));
  });
  return (
    <mesh ref={ref} position={[0, 0.5, 0]} material={mats}>
      <boxGeometry args={[SLAB.w, SLAB.h, SLAB.d]} />
    </mesh>
  );
}

function Rig({ children, progress }: { children: React.ReactNode; progress: MotionValue<number> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const p = progress.get();
    const g = ref.current!;
    const k = 1 - Math.pow(0.01, dt);
    // pointer tilt + a slow turn while the file is whole
    const idle = (1 - seg(p, 0.1, 0.2)) * Math.sin(state.clock.elapsedTime * 0.5) * 0.25;
    g.rotation.y += (state.pointer.x * 0.25 + idle - 0.15 * seg(p, 0.46, 0.66) * 0 - g.rotation.y) * k;
    g.rotation.x += (-state.pointer.y * 0.12 + 0.06 - g.rotation.x) * k;
    const zoom = mix(0, -1.2, ease(seg(p, 0.42, 0.55))) * (1 - ease(seg(p, 0.82, 0.95)));
    g.position.z += (zoom - g.position.z) * k;
  });
  return <group ref={ref}>{children}</group>;
}

export default function JourneyScene({
  progress,
  palette,
  active,
}: {
  progress: MotionValue<number>;
  palette: Palette;
  active: boolean;
}) {
  const page = useMemo(() => pageTexture(palette.bg === "#000000"), [palette.bg]);
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0.4, 11], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 6]} intensity={1.3} />
      <directionalLight position={[-6, -2, 4]} intensity={0.35} color={palette.accent} />
      <Rig progress={progress}>
        {[...Array(N).keys()].map((i) => (
          <Chunk key={i} i={i} progress={progress} palette={palette} page={page} />
        ))}
        <Chain progress={progress} palette={palette} />
        <Validators progress={progress} palette={palette} />
        <Verified progress={progress} palette={palette} />
        <WholePage progress={progress} page={page} palette={palette} />
        <Sheen progress={progress} strength={palette.bg === "#000000" ? 0.35 : 0.12} />
      </Rig>
      <ContactShadows position={[0, -2.45, 0]} scale={14} blur={2.6} far={5} opacity={palette.bg === "#000000" ? 0.6 : 0.28} resolution={256} color={palette.bg === "#000000" ? "#000000" : "#1e1b4b"} />
    </Canvas>
  );
}
