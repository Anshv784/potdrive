import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PotDrive: native file storage on Portaldot";

async function font(family: string, weight = 400) {
  // No browser User-Agent, so Google serves TrueType (Satori cannot read woff2).
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
}

export default async function OG() {
  const [serif, mono] = await Promise.all([font("Instrument Serif"), font("Geist Mono")]);
  const slips = ["#01  1.00 MiB  bafk2bzace…dmuy37oc", "#02  1.00 MiB  bafk2bzace…6vtltc3k", "#03  1.00 MiB  bafk2bzace…jzxotgzg", "root   217 B  bafykbzace…bzw2j6ka"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0f0e13", color: "#ece8e1", padding: 72, fontFamily: "Serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34 }}>
            <div style={{ width: 16, height: 16, borderRadius: 99, background: "#7b5cff" }} />
            PotDrive
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.02 }}>
            <span>Portaldot already had storage built in.</span>
            <span style={{ color: "#9a83ff", fontStyle: "italic" }}>Now you can use it.</span>
          </div>
          <div style={{ fontFamily: "Mono", fontSize: 18, color: "#a9a4b2" }}>TransactionStorage · IPFS CIDs · verified in-browser</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 60, gap: 12, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#efe9dd", color: "#1b1a20", borderRadius: 14, padding: "20px 24px", transform: "rotate(-1deg)" }}>
            <span style={{ fontSize: 30 }}>field-notes.pdf</span>
            <span style={{ fontFamily: "Mono", fontSize: 16, color: "#6d665a" }}>3.40 MiB · 4 chunks + root</span>
          </div>
          {slips.map((s, i) => (
            <div
              key={s}
              style={{
                display: "flex",
                fontFamily: "Mono",
                fontSize: 16,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${i === 3 ? "#7b5cff" : "#2a2832"}`,
                background: i === 3 ? "rgba(123,92,255,0.18)" : "#1c1b23",
                color: i === 3 ? "#ece8e1" : "#a9a4b2",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(serif ? [{ name: "Serif", data: serif, style: "normal" as const }] : []),
        ...(mono ? [{ name: "Mono", data: mono, style: "normal" as const }] : []),
      ],
    },
  );
}
