import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { DagDiagram } from "@/components/docs/diagrams";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Content addressing" };

export default function Page() {
  return (
    <Doc href="/docs/content-addressing">
      <DocHeader
        eyebrow="Concepts"
        title="Content addressing"
        summary="How PotDrive turns bytes into IPFS CIDs that Portaldot can serve, and how content-defined chunking makes new versions cheap."
      />

      <H2 id="cids">CIDs that Portaldot understands</H2>
      <p>
        TransactionStorage indexes data under <code>blake2_256(data)</code>, and the node&apos;s bitswap RPC accepts any CIDv1 whose
        multihash carries that digest. So every PotDrive block gets a CIDv1 with the <code>blake2b-256</code> multihash (
        <code>0xb220</code>):
      </p>
      <table>
        <thead>
          <tr>
            <th>Block</th>
            <th>Codec</th>
            <th>Prefix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>File leaf</td>
            <td><code>raw</code> (0x55)</td>
            <td><code>bafk2bzace…</code></td>
          </tr>
          <tr>
            <td>File root, directory</td>
            <td><code>dag-pb</code> (0x70)</td>
            <td><code>bafykbzace…</code></td>
          </tr>
        </tbody>
      </table>
      <Code
        title="sdk/src/cid.ts"
        code={`export function cidFor(bytes: Uint8Array, codec = RAW): CID {
  return CID.createV1(codec, Digest.create(BLAKE2B_256, blake2AsU8a(bytes, 256)));
}`}
      />
      <p>
        These are standard IPFS CIDs. Any IPFS tool can parse them, and a Portaldot node started with <code>--ipfs-server</code>{" "}
        serves them to IPFS peers over libp2p bitswap.
      </p>

      <H2 id="dag">Files as UnixFS DAGs</H2>
      <p>
        A file that fits in one chunk is a single raw block. Larger files get a UnixFS <code>dag-pb</code> root that links every
        leaf in order and records each leaf&apos;s size in <code>blockSizes</code>. That is the same structure{" "}
        <code>ipfs add --raw-leaves</code> builds, with blake2b instead of sha2-256.
      </p>
      <DagDiagram />
      <p>
        Because the root records leaf sizes, a reader can map any byte offset to the leaf that holds it. That is how the gateway
        answers HTTP <code>Range</code> requests by fetching only the leaves it needs (see <a href="/docs/gateway#range">Gateway</a>).
      </p>

      <H2 id="cdc">Content-defined chunking</H2>
      <p>
        Fixed-size chunking cuts every 1 MiB. Insert one byte near the start of a file and every later boundary shifts, so every
        chunk gets a new hash and has to be stored and paid for again. PotDrive uses <strong>FastCDC</strong> instead (Xia et al.,
        USENIX ATC 2016). A cut point is where a rolling gear hash of the last ~32 bytes matches a mask. Boundaries follow the
        content, so an edit only changes the chunks around it.
      </p>
      <table>
        <tbody>
          <tr><th className="w-44">Min / avg / max</th><td>256 KiB / 512 KiB / 1 MiB. The 1 MiB cap stays under bitswap&apos;s soft block limit.</td></tr>
          <tr><th>Normalization</th><td>Harder mask (2^-21) before the average size, easier mask (2^-17) after it.</td></tr>
          <tr><th>Gear table</th><td>256 values from a fixed splitmix32 seed. The table is part of the format: changing it changes every CID.</td></tr>
          <tr><th>Speed</th><td>Chunks and hashes 16 MiB in about 360 ms in Bun on an M-series Mac.</td></tr>
        </tbody>
      </table>

      <H3 id="measured">Measured on a 16 MiB file</H3>
      <p>New bytes that had to be stored after each edit (run <code>bun scripts/bench-cdc.ts</code> to reproduce):</p>
      <table>
        <thead>
          <tr>
            <th>Edit</th>
            <th>Fixed 1 MiB</th>
            <th>FastCDC</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Insert 1 KiB at 300 KiB</td><td>16,385 KiB (100%)</td><td><strong>609 KiB (3.7%)</strong></td></tr>
          <tr><td>Delete 10 KiB at 5 MiB</td><td>11,254 KiB (68.7%)</td><td><strong>343 KiB (2.1%)</strong></td></tr>
          <tr><td>Overwrite 4 KiB mid-file</td><td>1,024 KiB (6.3%)</td><td>898 KiB (5.5%)</td></tr>
          <tr><td>Append 2 MiB</td><td>2,048 KiB (11.1%)</td><td>2,513 KiB (13.6%)</td></tr>
        </tbody>
      </table>
      <p>
        At about 105 tPOT per MiB, re-uploading that file after a 1 KiB insertion costs roughly 1,680 tPOT with fixed chunks and
        62 tPOT with FastCDC. Fixed chunking only wins slightly on pure appends.
      </p>

      <H2 id="dedup">Deduplication against the chain</H2>
      <p>
        Before uploading, PotDrive reads <code>TransactionStorage.Transactions</code> once and compares content hashes. Any block
        Portaldot already holds, from an earlier version, another file or another user, is linked instead of stored. The cost
        sheet shows reused and new bytes separately, and the upload key only pays for the new ones.
      </p>
      <Code
        title="sdk/src/upload.ts"
        code={`const held = new Set((await listStored(api)).map((e) => e.contentHash));
const reused = file.blocks.filter((b) => held.has(contentHash(b.cid)));
const fresh  = file.blocks.filter((b) => !held.has(contentHash(b.cid)));   // only these are stored`}
      />
      <Callout kind="note">
        Dedup works because the CID is a hash of the bytes. It does not work for private files: each upload is sealed with a
        fresh key and IV, so identical plaintext gives unrelated ciphertext. That is intentional, since otherwise anyone could
        test whether you stored a known file.
      </Callout>

      <H2 id="directories">Directories</H2>
      <p>
        A folder becomes a UnixFS directory: a <code>dag-pb</code> node whose links are named entries, sorted by name. Building
        the same folder in any order gives the same root CID. Identical files inside it share blocks. Paths resolve one verified
        block at a time:
      </p>
      <Code
        title="resolve a path"
        code={`const s = await resolvePath("bafykbzace…", "assets/logo.svg");
// root (directory) → "assets" (directory) → "logo.svg" (file root or raw leaf)`}
      />
    </Doc>
  );
}
