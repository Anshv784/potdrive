#!/usr/bin/env bun
// PotDrive MCP server: lets AI agents store and read files on Portaldot.
//   bun mcp/server.ts            (stdio)
// Read tools need nothing. Write tools sign with POTDRIVE_SEED and are capped by
// POTDRIVE_MCP_MAX_BYTES (default 1 MiB per call) so an agent can't run up a bill.
import { readdir, readFile as readLocal, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { z } from "zod";
import {
  connect,
  expiresAt,
  formatPot,
  getFile,
  isEnvelope,
  listStored,
  NETWORK,
  openFile,
  placements,
  prepareFile,
  prepareFolder,
  proofReport,
  resolvePath,
  readRange,
  shareUrl,
  uploadFile,
} from "../sdk/src/index";

const SITE = process.env.POTDRIVE_SITE ?? "https://potdrive.anshverma.tech";
const MAX = Number(process.env.POTDRIVE_MCP_MAX_BYTES ?? 1024 * 1024);

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (t: string) => ({ content: [{ type: "text" as const, text: t }], isError: true });

async function signer() {
  if (!process.env.POTDRIVE_SEED) throw new Error("Writing needs POTDRIVE_SEED (a funded Portaldot account) in the MCP server's environment.");
  await cryptoWaitReady();
  return new Keyring({ type: "sr25519", ss58Format: NETWORK.ss58 }).addFromUri(process.env.POTDRIVE_SEED);
}

const server = new McpServer({ name: "potdrive", version: "0.1.0" });

server.registerTool(
  "potdrive_read",
  {
    title: "Read a file from Portaldot",
    description: "Fetch a file by CID (optionally a path inside a stored folder). Every block is re-hashed against its CID. Returns text, or saves binary to a local path.",
    inputSchema: { cid: z.string(), path: z.string().optional(), key: z.string().optional().describe("The #k= key of a private file"), saveTo: z.string().optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ cid, path, key, saveTo }) => {
    try {
      const target = path ? await resolvePath(cid, path) : null;
      let bytes = target ? await readRange(target, 0, target.size) : await getFile(cid);
      if (isEnvelope(bytes)) {
        if (!key) return fail("This file is private. Pass its key (the part after #k= in the link).");
        bytes = (await openFile(bytes, key)).data;
      }
      if (saveTo) {
        await writeFile(resolve(saveTo), bytes);
        return text(`Saved ${bytes.length} verified bytes to ${resolve(saveTo)}`);
      }
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 200_000));
      const binary = /[\u0000-\u0008\u000e-\u001f]/.test(decoded.slice(0, 2000));
      return binary ? text(`Binary file, ${bytes.length} bytes, verified. Pass saveTo to write it to disk.`) : text(decoded);
    } catch (e) {
      return fail((e as Error).message);
    }
  },
);

server.registerTool(
  "potdrive_info",
  {
    title: "Where a file lives on Portaldot",
    description: "Every block of a file or folder, the (block, index) holding it, and when the chain may drop it.",
    inputSchema: { cid: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ cid }) => {
    try {
      const api = await connect(NETWORK.http);
      const ps = await placements(api, cid);
      const head = (await api.rpc.chain.getHeader()).number.toNumber();
      const exp = expiresAt(ps);
      const lines = ps.map((p) => `${p.kind.padEnd(5)} ${p.cid}  ${p.entry ? `#${p.entry.block} tx ${p.entry.index} · ${p.entry.size} B` : "not held"}`);
      const left = exp ? `expires at block ${exp} (~${Math.round(((exp - head) * NETWORK.blockTimeMs) / 3_600_000)} h)` : "not fully held";
      return text(`${ps.length} block(s), ${left}\n${lines.join("\n")}`);
    } catch (e) {
      return fail((e as Error).message);
    }
  },
);

server.registerTool(
  "potdrive_network",
  {
    title: "What Portaldot is storing",
    description: "Everything TransactionStorage currently holds, plus recent storage-proof activity.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    try {
      const api = await connect(NETWORK.http);
      const [entries, proofs] = await Promise.all([listStored(api), proofReport(api, 6)]);
      const bytes = entries.reduce((s, e) => s + e.size, 0);
      return text(
        `${entries.length} stored item(s), ${bytes} bytes. Head #${proofs.head}. Proofs checked in last ${proofs.blocks.length} blocks: ${proofs.checkedCount}. Next proof due: ${proofs.nextDue ?? "none"}.\n` +
          entries.slice(0, 50).map((e) => `#${e.block} tx ${e.index}  ${e.size} B  ${e.contentHash}`).join("\n"),
      );
    } catch (e) {
      return fail((e as Error).message);
    }
  },
);

server.registerTool(
  "potdrive_store",
  {
    title: "Store a file on Portaldot",
    description: "Store a local file (or inline text) in Portaldot's TransactionStorage and return its share link. Costs tPOT from POTDRIVE_SEED.",
    inputSchema: { path: z.string().optional(), content: z.string().optional(), name: z.string().optional(), private: z.boolean().optional() },
    annotations: { destructiveHint: false, openWorldHint: true },
  },
  async (args) => {
    try {
      const bytes = args.path ? new Uint8Array(await readLocal(resolve(args.path))) : args.content !== undefined ? new TextEncoder().encode(args.content) : null;
      if (!bytes) return fail("Pass either path or content.");
      if (bytes.length > MAX) return fail(`That is ${bytes.length} bytes; this server allows ${MAX} per call (POTDRIVE_MCP_MAX_BYTES).`);
      const name = args.name ?? (args.path ? basename(args.path) : "note.txt");
      const owner = await signer();
      const api = await connect();
      const file = await prepareFile(bytes, { name, private: args.private });
      let cost = "";
      const r = await uploadFile({ api, file, owner, onEvent: (e) => e.type === "estimate" && (cost = `${formatPot(e.estimate.total, 3)} tPOT at most`) });
      return text(`Stored ${name} (${bytes.length} bytes, ${cost}).\nCID: ${r.root}\nLink: ${shareUrl(SITE, { root: r.root, key: r.key, name: file.private ? undefined : name })}`);
    } catch (e) {
      return fail((e as Error).message);
    }
  },
);

server.registerTool(
  "potdrive_deploy",
  {
    title: "Deploy a static site to Portaldot",
    description: "Store a local folder as a UnixFS directory and return the URL that serves it from the chain.",
    inputSchema: { dir: z.string() },
    annotations: { openWorldHint: true },
  },
  async ({ dir }) => {
    try {
      const root = resolve(dir);
      const walk = async (d: string): Promise<string[]> =>
        (await Promise.all((await readdir(d, { withFileTypes: true })).filter((e) => !e.name.startsWith(".")).map((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])))).flat();
      const entries = await Promise.all((await walk(root)).map(async (p) => ({ path: relative(root, p), bytes: new Uint8Array(await readLocal(p)) })));
      const total = entries.reduce((s, e) => s + e.bytes.length, 0);
      if (total > MAX) return fail(`That folder is ${total} bytes; this server allows ${MAX} per call.`);
      const file = await prepareFolder(entries, { name: basename(root) });
      const r = await uploadFile({ api: await connect(), file, owner: await signer() });
      return text(`Deployed ${entries.length} files.\nSite: ${SITE}/ipfs/${r.root}/`);
    } catch (e) {
      return fail((e as Error).message);
    }
  },
);

await server.connect(new StdioServerTransport());
