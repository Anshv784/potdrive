import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Nav } from "@/components/nav";
import { CodeBlock } from "@/components/code";
import { Architecture } from "@/components/docs/architecture";

export const metadata: Metadata = { title: "Docs" };

const toc = [
  ["overview", "Overview"],
  ["quickstart", "Quickstart"],
  ["how", "How storage works"],
  ["architecture", "Architecture"],
  ["sdk", "SDK"],
  ["cli", "CLI"],
  ["gateway", "Gateway API"],
  ["registry", "Registry contract"],
  ["private", "Private files"],
  ["keepalive", "Keep-alive and the keeper"],
  ["numbers", "Costs and limits"],
  ["faq", "FAQ"],
];

export default function Docs() {
  return (
    <>
      <Nav />
      <div className="mx-auto grid max-w-[1024px] gap-12 px-5 py-14 lg:grid-cols-[12rem_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-0.5 text-sm">
            <div className="mb-3 px-2 text-[13px] font-semibold">PotDrive</div>
            {toc.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block rounded-lg px-2 py-1.5 text-[14px] text-label-2 transition-colors duration-200 hover:bg-bg-2 hover:text-label">
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="prose-doc min-w-0 max-w-3xl">
          <p className="eyebrow text-accent">Documentation</p>
          <h1 id="overview" className="headline mt-1 text-[40px] sm:text-[48px]">PotDrive</h1>
          <p>
            PotDrive is storage middleware for Portaldot V3. It writes files into the chain&apos;s own{" "}
            <code>TransactionStorage</code> pallet, gives every file an IPFS CID, and reads it back through the node&apos;s bitswap
            RPC with every block re-hashed by the reader. Ownership and prepaid renewals live in a small Solidity contract on
            Revive.
          </p>
          <p>
            There is no separate network, token or pinning service. Data is held by Portaldot block producers, who must
            prove they still have it, for <strong>100,800 blocks (about 7 days)</strong> after it is stored or renewed.
          </p>

          <h2 id="quickstart">Quickstart</h2>
          <ul>
            <li>
              Install a Polkadot wallet (Talisman, SubWallet or polkadot&#123;.js&#125;) and fund a Portaldot address with test POT.
              During the Hacker House the Portaldot team sends tPOT to the native address you register on DoraHacks.
            </li>
            <li>
              Open <Link href="/drive">Drive</Link>, connect, drop a file. Review the fee estimate, pick how long to keep it,
              and sign once.
            </li>
            <li>Share the link. Anyone can open it; their browser fetches and verifies every block from Portaldot.</li>
          </ul>

          <h2 id="how">How storage works</h2>
          <h3>The pallet</h3>
          <p>
            <code>transactionStorage.store(data)</code> charges a fee and asks the node to index <code>data</code> under{" "}
            <code>blake2_256(data)</code>. The runtime records a <code>TransactionInfo</code> (content hash, size, chunk root)
            under the block number. For the next <code>RetentionPeriod</code> blocks, block authors must include a{" "}
            <code>checkProof</code> showing they hold a randomly chosen chunk of the data stored that many blocks ago.{" "}
            <code>renew(block, index)</code> resets the clock for the same fee as storing.
          </p>
          <h3>Why every block is its own transaction</h3>
          <p>
            The node&apos;s database indexes the <em>tail</em> of each extrinsic, one index entry per extrinsic. Two{" "}
            <code>store</code> calls inside one <code>utility.batch</code> would index the wrong bytes. So PotDrive sends one{" "}
            <code>store</code> per block. To keep that to one wallet prompt, your signature funds a throwaway upload key in your
            tab, which signs the stores and then returns its unspent balance with <code>balances.transferAll</code>. If the tab
            closes mid-upload, the key is saved in local storage and the Drive offers to sweep it.
          </p>
          <h3>CIDs</h3>
          <p>
            Files are cut into 1 MiB leaves. Each leaf is a raw block (<code>0x55</code>) with a blake2b-256 multihash (
            <code>0xb220</code>). Files bigger than one leaf get a UnixFS <code>dag-pb</code> root (<code>0x70</code>) that links
            the leaves in order, exactly like <code>ipfs add --raw-leaves</code> but hashed with blake2b. The node&apos;s{" "}
            <code>bitswap_v1_get</code> accepts any CIDv1 whose multihash is a stored digest, so these are real IPFS CIDs.
          </p>

          <h2 id="architecture">Architecture</h2>
          <Architecture />

          <h2 id="sdk">SDK</h2>
          <p>
            The SDK lives in <code>sdk/src</code> of the repo. It runs in browsers, Bun, Node and route handlers.
          </p>
          <CodeBlock
            title="store a file"
            code={`import { connect, prepareFile, uploadFile, shareUrl } from "@potdrive/sdk";

const api = await connect(); // wss://test-node-v3.portaldot.dev
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf", private: true });

const result = await uploadFile({
  api,
  file,
  owner: { address, signer },   // injected wallet signer, or a KeyringPair
  registry: REGISTRY,           // optional
  keepAlive: 0n,                // optional prepaid renewals, in planck
  sessions,                     // optional: persist the upload key until it is swept
  onEvent: (e) => { /* estimate | session | authorized | block | verified | swept | done */ },
});

shareUrl("https://potdrive.anshverma.tech", result); // .../f/<cid>#k=<key>`}
          />
          <div className="h-4" />
          <CodeBlock
            title="read and verify"
            code={`import { getFile, openFile, isEnvelope } from "@potdrive/sdk";

const bytes = await getFile(cid, {
  onChunk: (c) => console.log(c.index, c.status, c.ms), // "ok" | "missing" | "corrupt"
});
const plain = isEnvelope(bytes) ? (await openFile(bytes, key)).data : bytes;`}
          />
          <table>
            <thead>
              <tr>
                <th>Function</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["prepareFile(bytes, opts)", "Seal (optional), chunk, hash and build the DAG. No network."],
                ["estimateUpload(api, file, owner)", "Fee estimate from two paymentInfo calls, plus registry fee and deposit."],
                ["uploadFile(opts)", "The full one-signature flow with progress events."],
                ["getBlock(cid) / getFile(cid)", "bitswap_v1_get with blake2b verification of every block."],
                ["placements(api, cid)", "Where each block is held: (block, index), size, expiry."],
                ["renewFile(api, account, cid)", "renew() every block of a file. Anyone can call it."],
                ["listStored(api)", "Everything TransactionStorage currently holds."],
                ["readFile / readOwned / readPage", "Registry reads over Revive's Ethereum RPC."],
              ].map(([f, d]) => (
                <tr key={f}>
                  <td>
                    <code>{f}</code>
                  </td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 id="cli">CLI</h2>
          <CodeBlock
            title="terminal"
            code={`export POTDRIVE_SEED="your twelve words ..."
bun cli/potdrive.ts put ./deck.pdf --private     # store, prints a share link
bun cli/potdrive.ts put ./logo.png --keep 4      # + 4 prepaid renewals (needs POTDRIVE_REGISTRY)
bun cli/potdrive.ts get <cid> -o deck.pdf --key <k>
bun cli/potdrive.ts info <cid>                   # placements and expiry
bun cli/potdrive.ts renew <cid>                  # +100,800 blocks for every block
bun cli/potdrive.ts ls                           # everything the chain holds`}
          />

          <h2 id="gateway">Gateway API</h2>
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Returns</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>GET /ipfs/&lt;cid&gt;</code>
                </td>
                <td>
                  The file, verified. Content-Type from <code>?name=</code>, the registry, or the first bytes. HTML and SVG are
                  served as text so stored files can&apos;t run on this origin. Immutable caching, <code>ETag</code> = CID.
                </td>
              </tr>
              <tr>
                <td>
                  <code>?download=name.ext</code>
                </td>
                <td>Adds a Content-Disposition attachment header.</td>
              </tr>
              <tr>
                <td>
                  <code>GET /api/file/&lt;cid&gt;</code>
                </td>
                <td>JSON: format, each block&apos;s (block, index, size), expiry block, registry record.</td>
              </tr>
              <tr>
                <td>
                  <code>GET /api/stored</code>
                </td>
                <td>JSON: every TransactionStorage entry and the public registry records.</td>
              </tr>
            </tbody>
          </table>
          <p>Sealed files come back as ciphertext. The gateway never sees a key.</p>

          <h2 id="registry">Registry contract</h2>
          <p>
            <code>PotDriveRegistry</code> is plain Solidity compiled to EVM bytecode and deployed through{" "}
            <code>revive.instantiateWithCode</code> (Portaldot V3 sets <code>AllowEVMBytecode = true</code>). PotDrive calls it
            with <code>revive.call</code> from the same Polkadot wallet that signs the upload, in the same batch. Your EVM
            identity is your account&apos;s mapped H160 (<code>reviveApi.address</code>).
          </p>
          <p>
            Revive charges a storage deposit per byte, so a record is two packed slots (owner, size, flags, chunks, stored/expiry
            blocks, keep-alive balance). Names, types and the file list are event logs, read with <code>eth_getLogs</code>. The
            runtime bytecode is 2.6 KB.
          </p>
          <CodeBlock
            title="PotDriveRegistry.sol (interface)"
            code={`function register(bytes32 root, uint64 size, uint32 chunks, bool isPrivate, string name, string mime) payable;
function fund(bytes32 root) payable;                         // anyone can top up keep-alive
function renewed(bytes32 root, uint32 expiresAt, uint256 cost); // keeper only, reimbursed from keep-alive
function withdraw(bytes32 root);                             // owner takes back unused keep-alive
function transfer(bytes32 root, address to);
function setListed(bytes32 root, bool listed);
function fileOf(bytes32 root) view returns (owner, size, chunks, storedAt, expiresAt, keepAlive, isPrivate, listed);`}
          />

          <h2 id="private">Private files</h2>
          <p>
            With <em>Private</em> on, the browser seals the file with AES-256-GCM before hashing. The sealed payload carries the
            real name and type, so the chain and the registry only learn the ciphertext size. The 256-bit key is put in the
            link after <code>#k=</code>. Browsers never send the fragment to a server, so the gateway and PotDrive never see it.
            Anyone holding the full link can open the file. Without it, the bytes on Portaldot are noise.
          </p>

          <h2 id="keepalive">Keep-alive and the keeper</h2>
          <p>
            Portaldot drops data after 100,800 blocks unless someone calls <code>renew</code>. When you upload, you can prepay
            renewals into the registry. A keeper runs daily, finds prepaid files with under 36 hours left, prices the renewals
            with <code>paymentInfo</code>, sends them, then calls <code>renewed()</code> to be reimbursed exactly that amount.
            The contract caps what it can take at each file&apos;s balance, and the owner can <code>withdraw</code> the rest
            at any time. Renewal is permissionless, so you can also renew any file yourself.
          </p>

          <h2 id="numbers">Costs and limits</h2>
          <table>
            <tbody>
              {[
                ["Retention", "100,800 blocks per store or renew (~7 days at 6 s blocks)"],
                ["Max per transaction", "8 MiB (MaxTransactionSize); PotDrive uses 1 MiB blocks"],
                ["Fee", "≈ 0.11 tPOT per KiB, ≈ 105 tPOT per MiB on the V3 testnet, measured 17 Oct 2026. The length fee dominates."],
                ["Renewal", "Same fee as storing the same bytes"],
                ["Registry deposit", "≈ 224 tPOT one-time to deploy the contract (refundable code deposit)"],
                ["Drive upload size", "64 MiB per file in the UI"],
              ].map(([k, v]) => (
                <tr key={k}>
                  <th className="w-48">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 id="faq">FAQ</h2>
          <h3>Is this permanent storage?</h3>
          <p>
            No. Portaldot keeps data for a rolling window that someone has to renew. That is honest pricing: validators are paid to
            keep and prove data for a known time. Keep-alive automates the renewing.
          </p>
          <h3>Can someone else&apos;s IPFS node fetch my file?</h3>
          <p>
            The CIDs are standard. A Portaldot node started with <code>--ipfs-server</code> serves them over libp2p bitswap. The
            public testnet node exposes the <code>bitswap_v1_get</code> RPC that PotDrive reads from.
          </p>
          <h3>What if the PotDrive site goes away?</h3>
          <p>
            Nothing is lost. The data is in Portaldot, the CID is in your link, and the SDK or CLI can fetch and verify it from any
            Portaldot node.
          </p>
        </article>
      </div>
      <Footer />
    </>
  );
}
