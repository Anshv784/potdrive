import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PotDrive: storage, built into Portaldot";

async function font(family: string, weight: number) {
  // No browser User-Agent, so Google serves TrueType (Satori cannot read woff2).
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
}

export default async function OG() {
  const [bold, regular] = await Promise.all([font("Inter", 600), font("Inter", 400)]);
  const rows = ["Block 1", "Block 2", "Block 3", "Block 4", "Root"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#ffffff", color: "#1d1d1f", fontFamily: "Inter", paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #5e5ce6, #0a84ff)" }} />
          PotDrive
        </div>
        <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: -2.5, marginTop: 28 }}>Storage, built into the chain.</div>
        <div style={{ fontSize: 30, color: "#6e6e73", marginTop: 14 }}>Files in Portaldot&apos;s own TransactionStorage. One signature.</div>
        <div style={{ display: "flex", gap: 14, marginTop: 56 }}>
          {rows.map((r, i) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 18, background: "#f5f5f7", fontSize: 24 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  background: i === 4 ? "#0071e3" : "#34c759",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                ✓
              </div>
              {r}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(bold ? [{ name: "Inter", data: bold, weight: 600 as const, style: "normal" as const }] : []),
        ...(regular ? [{ name: "Inter", data: regular, weight: 400 as const, style: "normal" as const }] : []),
      ],
    },
  );
}
