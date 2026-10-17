// A local stand-in for a Portaldot node's bitswap_v1_get, preloaded with a small site and a
// large binary. Used to exercise the gateway end to end without spending tPOT.
//   bun scripts/fake-node.ts   then   POTDRIVE_RPC_URL=http://localhost:9944 next dev
import { u8aToHex } from "@polkadot/util";
import { buildDirectory, buildFileDag } from "../sdk/src/dag";

const enc = (s: string) => new TextEncoder().encode(s);
const big = new Uint8Array(5 * 1024 * 1024).map((_, i) => (i * 2654435761) >>> 24);
const site = buildDirectory([
  { path: "index.html", bytes: enc(`<!doctype html><link rel="stylesheet" href="style.css"><h1>Served from Portaldot</h1><script src="app.js"></script>`) },
  { path: "style.css", bytes: enc("h1{font-family:sans-serif;color:#0071e3}") },
  { path: "app.js", bytes: enc("document.body.append(' · document.domain=' + (document.domain || 'opaque'))") },
  { path: "media/big.bin", bytes: big },
]);
const file = buildFileDag(big);
const blocks = new Map<string, Uint8Array>();
for (const b of [...site.blocks, ...file.blocks]) blocks.set(b.cid.toString(), b.bytes);

Bun.serve({
  port: Number(process.env.PORT ?? 9944),
  async fetch(req) {
    const { id, method, params } = (await req.json()) as { id: number; method: string; params: string[] };
    if (method !== "bitswap_v1_get") return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
    const bytes = blocks.get(params[0]);
    return bytes
      ? Response.json({ jsonrpc: "2.0", id, result: u8aToHex(bytes) })
      : Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: "Transaction not found" } });
  },
});
console.log(`site ${site.root}\nfile ${file.root}\nblocks ${blocks.size}`);
