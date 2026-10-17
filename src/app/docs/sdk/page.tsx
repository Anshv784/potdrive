import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Api, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "SDK reference" };

export default function Page() {
  return (
    <Doc href="/docs/sdk">
      <DocHeader eyebrow="Reference" title="SDK" summary="TypeScript. Runs in browsers, Bun, Node and serverless functions. Source: sdk/src." />

      <Code
        title="imports"
        code={`// Everything
import { prepareFile, uploadFile, getFile } from "@potdrive/sdk";
// Or per module, to keep @polkadot/api out of bundles that only read
import { getFile } from "@potdrive/sdk/fetch";`}
      />

      <H2 id="prepare">Prepare</H2>
      <Api
        id="prepareFile"
        signature="prepareFile(data: Uint8Array, opts: PrepareOptions): Promise<PreparedFile>"
        params={[
          ["opts.name", "string", "File name. Recorded in the registry, or sealed inside the envelope for private files."],
          ["opts.mime", "string?", "Content type. Defaults to application/octet-stream."],
          ["opts.private", "boolean?", "Seal with AES-256-GCM first. Sets PreparedFile.key."],
          ["opts.chunking", "Chunking?", "{ cdc: CdcOptions } (default) or a fixed size in bytes."],
        ]}
        returns="{ root, kind, blocks, storedBytes, originalBytes, name, mime, private, key? }"
      >
        Chunks, hashes and builds the UnixFS DAG locally. No network access.
      </Api>
      <Api
        id="prepareFolder"
        signature="prepareFolder(entries: { path: string; bytes: Uint8Array }[], opts: { name: string }): Promise<PreparedFile>"
        returns="PreparedFile with kind 'directory' and files[]"
      >
        A UnixFS directory. Paths may contain <code>/</code>. <code>..</code> is rejected. Links are sorted, so the CID does not
        depend on input order.
      </Api>

      <H2 id="upload">Upload</H2>
      <Api
        id="estimateUpload"
        signature="estimateUpload(api, file, owner: string, opts?: { registry?: Address; keepAlive?: bigint }): Promise<Estimate>"
        returns="{ storeFees, registryFee, registryDeposit, keepAlive, budget, total, alreadyStored, reused, reusedBytes, newBytes }"
      >
        One state read for deduplication and two <code>paymentInfo</code> calls for the fee model. All amounts are in planck (14
        decimals).
      </Api>
      <Api
        id="uploadFile"
        signature="uploadFile(opts: UploadOptions): Promise<UploadResult>"
        params={[
          ["api", "ApiPromise", "From connect()."],
          ["file", "PreparedFile", "From prepareFile or prepareFolder."],
          ["owner", "Account", "{ address, signer } from a wallet extension, or a KeyringPair."],
          ["registry", "Address?", "Register ownership in the same signature."],
          ["keepAlive", "bigint?", "Prepaid renewals in planck, held by the registry."],
          ["sessions", "SessionStore?", "Persist the upload key until it is swept."],
          ["concurrency", "number?", "Store extrinsics in flight. Default 4."],
          ["onEvent", "(e: UploadEvent) => void", "estimate, session, authorized, block, verified, swept, done."],
        ]}
        returns="{ root, key?, blocks: BlockState[], authorizeTx?, deduplicated }"
      >
        The one-signature flow described in <a href="/docs/uploads">One-signature uploads</a>.
      </Api>
      <Api id="recoverSession" signature="recoverSession(api, mnemonic: string, to: string): Promise<void>">
        Sends an abandoned upload key&apos;s balance back to its owner.
      </Api>

      <H2 id="read">Read</H2>
      <Api id="getBlock" signature="getBlock(cid: CID | string, url?: string): Promise<Uint8Array>">
        One block via <code>bitswap_v1_get</code>, verified. Throws <code>NotFoundError</code> or <code>IntegrityError</code>.
      </Api>
      <Api id="getFile" signature="getFile(cid, opts?: { onLayout?, onChunk?, concurrency? }): Promise<Uint8Array>">
        A whole file, every leaf verified. <code>onChunk</code> reports each leaf as <code>ok</code>, <code>missing</code> or{" "}
        <code>corrupt</code>, with timing.
      </Api>
      <Api id="stat" signature="stat(cid): Promise<Stat>" returns="{ cid, kind: 'raw' | 'file' | 'directory', size, node?, raw? }">
        Reads one block and decodes it.
      </Api>
      <Api id="readRange" signature="readRange(stat: Stat, start: number, end: number, opts?): Promise<Uint8Array>">
        Bytes <code>[start, end)</code>, fetching only the leaves that overlap the range.
      </Api>
      <Api id="resolvePath" signature="resolvePath(root, path: string): Promise<Stat>">
        Walks a UnixFS directory path. Throws <code>PathError</code> if a segment is missing or a file is used as a directory.
      </Api>

      <H2 id="chain">Chain state and renewals</H2>
      <Api id="listStored" signature="listStored(api): Promise<StoredEntry[]>" returns="{ block, index, contentHash, size, expiresAt }[]">
        Everything TransactionStorage currently holds, newest first.
      </Api>
      <Api id="placements" signature="placements(api, root): Promise<Placement[]>">
        Every block under a root (directories, file roots, leaves) and the <code>(block, index)</code> where it is held.
      </Api>
      <Api id="renewFile" signature="renewFile(api, account, root, onRenewed?): Promise<number>">
        Sends <code>renew</code> for every block and returns the earliest renewal block. Permissionless.
      </Api>
      <Api id="proofReport" signature="proofReport(api, depth = 12): Promise<ProofReport>">
        Recent blocks, whether each carried <code>checkProof</code> or <code>ProofChecked</code>, and when the next proof is due.
      </Api>

      <H2 id="more">Sponsored uploads, sharing, NFTs</H2>
      <Api id="uploadSponsored" signature="uploadSponsored({ api, file, owner: { address, signRaw }, relayUrl, onEvent }): Promise<UploadResult>">
        Gasless upload through the MetaTx relay. See <a href="/docs/sponsored">Gasless uploads</a>.
      </Api>
      <Api id="signMetaTx" signature="signMetaTx(api, keyPair, call, nonce?): { metaTx, hex, length }">
        Builds and signs a <code>PalletMetaTxMetaTx</code> for Portaldot&apos;s extension pipeline.
      </Api>
      <Api id="sealToInbox" signature="sealToInbox(fileKey, inboxPublicKey, root) / openFromInbox(sealed, inboxPrivateKey, root)">
        X25519 + HKDF-SHA256 + AES-256-GCM, with the root bound as AAD. <code>newInbox()</code> makes a key pair.
      </Api>
      <Api id="planMint" signature="planMint(api, owner, { name, image, url?, mime? }) → mintCalls(api, owner, plan) → ownedNfts(api, owner)">
        Native Nfts pallet minting in one batch, with metadata kept under the 256-byte StringLimit.
      </Api>
      <Api id="readVersions" signature="readVersions(registry, root): Promise<{ root, size, block }[]>">
        Follows <code>parent</code> links in <code>Registered</code> logs, newest first.
      </Api>

      <H2 id="low-level">Low level</H2>
      <Api id="cidFor" signature="cidFor(bytes, codec = RAW): CID">
        CIDv1 with a blake2b-256 multihash, the digest TransactionStorage indexes.
      </Api>
      <Api id="cdcChunks" signature="cdcChunks(data, opts = CDC_DEFAULT): Uint8Array[]">
        FastCDC with normalized chunking. Defaults: 256 KiB min, 512 KiB average, 1 MiB max.
      </Api>
      <Api id="buildFileDag" signature="buildFileDag(bytes, chunking?): FileDag">
        Raw leaves plus a UnixFS dag-pb root. <code>blocks</code> is unique by CID.
      </Api>
      <Api id="sealFile" signature="sealFile(data, meta) / openFile(bytes, key)">
        The private-file envelope. See <a href="/docs/private-files">Private files</a>.
      </Api>
    </Doc>
  );
}
