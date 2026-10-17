#!/usr/bin/env bun
// Retakes every image in README.md from a running dev server.
//   bun run dev   (in another terminal)   then   bun scripts/ui/readme-shots.ts [http://localhost:3000]
// Drive shots use the dev-only simulation (?simulate), which replays a real upload's
// event stream without spending tPOT.
import { chromium, type Page } from "playwright";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dir, "../../docs/assets");
const tmp = await mkdtemp(join(tmpdir(), "potdrive-shots-"));

function noise(n: number, seed: number) {
  const out = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

const samples: [string, number][] = [
  ["Brand-Guide.pdf", 900_000],
  ["Launch-Video.mp4", 2_400_000],
  ["Q4-Roadmap.key", 1_300_000],
  ["notes.txt", 120_000],
  ["Field-Notes.pdf", 3_500_000],
];
for (const [name, size] of samples) await writeFile(join(tmp, name), noise(size, size));
const v2 = noise(900_000, 900_000);
v2.set(noise(4000, 7), 400_000);
await writeFile(join(tmp, "Brand-Guide-v2.pdf"), v2);

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const errors: string[] = [];

async function page(width: number, height: number, scheme: "light" | "dark" = "light"): Promise<Page> {
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, colorScheme: scheme });
  p.on("pageerror", (e) => errors.push(`${p.url()}: ${e.message}`));
  return p;
}

async function shot(p: Page, name: string, full = false) {
  await p.screenshot({ path: join(OUT, name), type: "jpeg", quality: 82, fullPage: full });
  console.log("  ✓", name);
}

async function upload(p: Page, file: string, parentVia?: string) {
  if (parentVia) {
    const [chooser] = await Promise.all([p.waitForEvent("filechooser"), p.getByRole("button", { name: parentVia, exact: true }).click()]);
    await chooser.setFiles(join(tmp, file));
  } else {
    await p.locator("input[type=file]").first().setInputFiles(join(tmp, file));
  }
  await p.getByText("Store on Portaldot").waitFor();
  await p.waitForTimeout(1500);
  await p.getByText("Store on Portaldot").click();
  await p.getByText("1 upload complete").waitFor({ timeout: 30_000 });
  await p.getByRole("button", { name: "Dismiss" }).click();
}

// banner
{
  const p = await browser.newPage({ viewport: { width: 1600, height: 560 }, deviceScaleFactor: 1.5 });
  await p.goto(`file://${resolve(import.meta.dir, "banner.html")}`, { waitUntil: "networkidle" });
  await p.screenshot({ path: join(OUT, "banner.png") });
  console.log("  ✓ banner.png");
  await p.close();
}

// landing
{
  const p = await page(1440, 900);
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForTimeout(3500);
  await shot(p, "home.jpg");
  await p.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await p.waitForTimeout(8000);
  await shot(p, "explore.jpg");
  await p.goto(`${BASE}/docs/content-addressing`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await shot(p, "docs.jpg");
  await p.close();
}

// scroll journey (WebGL), one frame per theme
for (const [scheme, at, name] of [["light", 0.22, "journey.jpg"], ["dark", 0.56, "journey-dark.jpg"]] as const) {
  const p = await page(1440, 900, scheme);
  await p.goto(BASE, { waitUntil: "networkidle" });
  const { top, h } = await p.evaluate(() => {
    const el = document.querySelector<HTMLElement>('section[aria-label^="How a file"]')!;
    return { top: el.getBoundingClientRect().top + scrollY, h: el.offsetHeight };
  });
  await p.evaluate((y) => scrollTo(0, y), top + at * (h - 900));
  await p.waitForTimeout(3000);
  await shot(p, name);
  await p.close();
}

// drive (simulation)
{
  const p = await page(1440, 900);
  await p.goto(`${BASE}/drive?simulate`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  for (const [name] of samples) await upload(p, name);

  await p.locator("tbody tr").nth(1).click();
  await p.waitForTimeout(600);
  await shot(p, "drive.jpg");

  await p.locator("input[type=file]").first().setInputFiles(join(tmp, "Field-Notes.pdf"));
  await p.getByText("Store on Portaldot").waitFor();
  await p.waitForTimeout(1500);
  await shot(p, "upload.jpg");
  await p.getByText("Store on Portaldot").click();
  await p.waitForTimeout(2600);
  await p.getByRole("button", { name: "Details", exact: true }).click();
  await p.waitForTimeout(900);
  await shot(p, "storing.jpg");
  await p.getByText("Stored on Portaldot").waitFor({ timeout: 30_000 });
  await p.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

  const brand = p.locator("tbody tr", { hasText: "Brand-Guide.pdf" });
  await brand.click();
  await upload(p, "Brand-Guide-v2.pdf", "New version");
  await p.locator("tbody tr", { hasText: "Brand-Guide-v2.pdf" }).click();
  await p.waitForTimeout(600);
  await shot(p, "versions.jpg");

  await p.getByRole("button", { name: "Mint NFT", exact: true }).click();
  await p.waitForTimeout(2500);
  await shot(p, "mint.jpg");
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();

  await p.locator("tbody tr").first().click({ button: "right" });
  await p.waitForTimeout(300);
  await shot(p, "menu.jpg");
  await p.close();
}

// dark + phone
{
  const p = await page(1440, 900, "dark");
  await p.goto(`${BASE}/drive?simulate`, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "networkidle" });
  for (const [name] of samples.slice(0, 4)) await upload(p, name);
  await p.getByLabel("Grid view").click();
  await p.waitForTimeout(600);
  await shot(p, "dark.jpg");
  await p.close();

  const m = await page(390, 844);
  await m.goto(BASE, { waitUntil: "networkidle" });
  await m.waitForTimeout(3000);
  await shot(m, "phone.jpg");
  await m.close();
}

await browser.close();
if (errors.length) {
  console.log("\nPage errors:\n" + errors.join("\n"));
  process.exitCode = 1;
}
