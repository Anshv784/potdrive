import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Registry contracts" };

const sizes: [string, string, string, string][] = [
  ["PotDriveRegistry", "5,619 B", "≈ 447 tPOT", "Always. Proves and records files, keep-alive, sharing."],
  ["PotDrivePermits", "4,112 B", "≈ 323 tPOT", "Optional. Gasless registration with wallet signatures."],
  ["PotDriveVerifier", "2,999 B", "≈ 245 tPOT", "Optional. proveBlock for other contracts."],
  ["PotDriveCheck", "3,028 B", "0", "Never deployed. Runs through eth_call."],
];

export default function Page() {
  return (
    <Doc href="/docs/registry">
      <DocHeader
        eyebrow="Reference"
        title="Registry contracts"
        summary="Solidity on Portaldot's Revive pallet that does not take an uploader's word for anything: it hashes with Portaldot's own blake2b, decodes IPFS structure, and checks Polkadot wallet signatures."
      />

      <H2 id="proves">What the contract proves</H2>
      <p>
        A file registry is easy to write and easy to lie to: the uploader says how big a file is and the contract writes it down.
        PotDrive&apos;s registry instead receives the file&apos;s root block and works the facts out itself.
      </p>
      <ol>
        <li>
          <strong>The root is real.</strong> It hashes the block with blake2b-256 through Portaldot&apos;s System precompile, the exact hash
          TransactionStorage indexes data under, so the record&apos;s key is the chain&apos;s own content hash.
        </li>
        <li>
          <strong>The structure is valid.</strong> A protobuf decoder written in Solidity parses the dag-pb node and its UnixFS payload. Every
          link must be a CIDv1 over blake2b-256, every block size must equal its link&apos;s size and point at a raw leaf, the sizes must add
          up to the file size, and directory entries must be named, slash-free and strictly sorted.
        </li>
        <li>
          <strong>Size and block count are derived, not claimed.</strong> They are what the bytes describe, so keep-alive can be priced
          against them.
        </li>
      </ol>
      <p>
        A forged root (one block size changed, every hash still valid) is refused with <code>SizeMismatch()</code>, on the live chain. The
        only exception is a file that is a single raw block: up to 1 MiB is too much to hash in a transaction, so its size is recorded as
        claimed and the record is not marked <code>proven</code>.
      </p>

      <H2 id="precompile">Portaldot&apos;s System precompile</H2>
      <p>
        pallet-revive exposes runtime functions to contracts at <code>0x0000…0900</code>. Portaldot V3 has it enabled; we checked both
        functions against the live chain before relying on them.
      </p>
      <Code
        lang="solidity"
        title="lib/ISystem.sol"
        code={`interface ISystem {
    function hashBlake256(bytes memory input) external pure returns (bytes32);      // = TransactionStorage's hash
    function sr25519Verify(uint8[64] calldata signature, bytes calldata message,
                           bytes32 publicKey) external view returns (bool);           // Polkadot wallet keys
}`}
      />
      <p>
        <code>hashBlake256(&quot;potdrive&quot;)</code> on Portaldot returns <code>0x5663f503…29707</code>, byte for byte what the SDK
        computes. The registry calls it with hand-assembled call data rather than the ABI encoder, which saves bytecode.
      </p>

      <H2 id="permits">Gasless registration with wallet signatures</H2>
      <p>
        <code>PotDrivePermits</code> lets a sponsor register a file for someone who has no tPOT. The owner signs a permit in their normal
        Polkadot wallet popup. The contract rebuilds the exact text that popup showed, CID and all, and checks the signature with{" "}
        <code>sr25519Verify</code>:
      </p>
      <Code
        lang="text"
        title="What the wallet shows"
        code={`PotDrive: store and register a file
cid: bafykbzacebnfotgzyu32ypiveqew5czbgjqmqn2wnsbmk7ydzfpzybzw2j6ka
name: deck.pdf
type: application/pdf
private: no
previous: none
registry: 0x…
chain: 420420777
nonce: 0
valid until block: 84700
sponsored upload for: 5CX7…
upload key: 5F3s…
bytes: 3567616`}
      />
      <ul>
        <li>
          <strong>The CID line is computed in Solidity.</strong> The contract base32-encodes{" "}
          <code>0x01 ‖ codec ‖ 0xa0e40220 ‖ digest</code>, so the wallet shows the same ID the Drive shows.
        </li>
        <li>
          <strong>Wallets sign raw text wrapped in <code>&lt;Bytes&gt;…&lt;/Bytes&gt;</code>.</strong> The contract builds the text inside
          that wrapper and verifies over it.
        </li>
        <li>
          <strong>Every field is bound.</strong> Changing the name, the budget or the nonce invalidates the signature. Names cannot contain
          line breaks, so they cannot forge another line.
        </li>
        <li>
          <strong>The owner is the signer&apos;s Revive address:</strong> <code>keccak256(publicKey)[12..]</code>, or the first 20 bytes
          for Ethereum-derived accounts. We checked this against <code>reviveApi.address</code> on chain.
        </li>
        <li>
          <strong>One signature, two uses.</strong> The relay checks the same signature before paying for the storage through the MetaTx
          pallet. Its own terms (upload key, byte budget) are the last lines of the text.
        </li>
      </ul>

      <H2 id="keeper">Keeper accountability</H2>
      <p>
        The keeper renews files natively and claims the cost from each file&apos;s prepaid balance. The contract cannot read
        TransactionStorage, so instead of trusting the claim it bounds it by what it proved:
      </p>
      <ul>
        <li>
          At most <code>feeCap</code> per stored byte (content plus root block). The default is 1.5× the measured 0.1135 tPOT per KiB.
        </li>
        <li>Only within about 2 days of expiry, and the new expiry may be at most one retention period from now, so a file pays at most once per period.</li>
        <li>Never more than the file&apos;s balance, and every claim is a public <code>Renewed</code> event the owner can audit.</li>
      </ul>

      <H2 id="check">Verify anything for free</H2>
      <p>
        <code>PotDriveCheck</code> is never deployed. Its creation code goes through <code>eth_call</code>: Portaldot&apos;s runtime runs
        the constructor, which hashes the block with the precompile, decodes it, optionally checks a signature, and returns the report as
        the call&apos;s result. Nothing is stored or paid. The landing page does this from your browser, and the file page and Drive do it
        for every stored file through <code>/api/verify/&lt;cid&gt;</code>.
      </p>
      <Code
        title="@potdrive/sdk/onchain"
        code={`import { checkOnChain } from "@potdrive/sdk/onchain";

const r = await checkOnChain(cid);   // fetches the root block over bitswap, then eth_call
// { matches: true, kind: "file", size: 3150049, links: 4, chainId: 420420777, block: 84376 }`}
      />
      <p>
        Contracts that want to use stored bytes can deploy <code>PotDriveVerifier</code> and call{" "}
        <code>proveBlock(root, rootNode, index, data)</code>, which returns true only if <code>data</code> is block <code>index</code> of
        that file.
      </p>

      <H2 id="budget">Bytecode budget</H2>
      <p>
        Revive charges a deposit for contract code at about 0.078 tPOT per byte, measured by dry-running each deploy. That is roughly 700
        times what TransactionStorage charges per byte, so the design is driven by code size:
      </p>
      <table>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Init code</th>
            <th>Deposit</th>
            <th>Deployed</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map(([c, b, d, w]) => (
            <tr key={c}>
              <td>
                <code>{c}</code>
              </td>
              <td className="whitespace-nowrap">{b}</td>
              <td className="whitespace-nowrap">{d}</td>
              <td>{w}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>The first all-in-one version was 12,165 bytes, a 952 tPOT deposit. What brought it down:</p>
      <ul>
        <li>Read-only checks moved out of the registry into contracts that run through <code>eth_call</code> or are optional.</li>
        <li>Gasless registration is a separate module, paid for only when sponsorship is switched on.</li>
        <li>
          One <code>register</code> entry point. The IR optimizer had inlined the registration logic into two entry points, so it was
          duplicated.
        </li>
        <li>
          Precompile calls and the permit text are assembled by hand: one buffer and one cursor, instead of the ABI encoder and chained{" "}
          <code>abi.encodePacked</code>.
        </li>
        <li>
          A record is two packed storage slots. Names, types and version links live in event logs, which cost no deposit, and no metadata
          hash is emitted.
        </li>
      </ul>

      <H2 id="interface">Interface</H2>
      <Code
        lang="solidity"
        title="PotDriveRegistry.sol"
        code={`struct Upload { bytes rootNode; bytes32 leaf; uint64 leafSize; }   // rootNode = dag-pb root block
struct Meta   { bool isPrivate; string name; string mime; bytes32 parent; }

function register(Upload u, Meta m, address owner, bytes32 signer) payable returns (bytes32 root);
function fund(bytes32 root) payable;                                 // anyone
function claimRenewal(bytes32 root, uint32 expiresAt, uint256 cost); // keeper, bounded as above
function withdraw(bytes32 root);                                     // owner
function transfer(bytes32 root, address to);                         // owner
function setListed(bytes32 root, bool listed);                       // owner
function setInboxKey(bytes32 key);                                   // X25519 key for receiving shares
function share(bytes32 root, address to, bytes sealedKey);           // owner
function files(bytes32 root) view returns (address owner, uint64 size, uint8 flags, uint8 kind,
    uint32 chunks, uint32 storedAt, uint32 expiresAt, uint32 rootLen, uint128 keepAlive);

event Registered(bytes32 indexed root, address indexed owner, uint64 size, uint32 chunks, bool isPrivate,
                 string name, string mime, bytes32 parent, bool proven, bytes32 signer);`}
      />
      <p>
        <code>owner</code> and <code>signer</code> are only honoured when the caller is the permit module. <code>flags</code> holds
        private (1), unlisted (2) and proven (4). <code>kind</code> is 0 for a single raw block, 1 for a directory, 2 for a file, which is
        how readers rebuild the CID from a record.
      </p>

      <H2 id="deploy">Deploying through Revive</H2>
      <Callout kind="important" title="EVM constructors on Revive">
        Constructor arguments must be appended to the init code, and the <code>data</code> argument of{" "}
        <code>instantiateWithCode</code> must be empty. Passing them separately fails with <code>EvmConstructorNonEmptyData</code>{" "}
        (Revive error 54).
      </Callout>
      <Code lang="bash" title="Terminal" code={`POTDRIVE_SEED="…" KEEPER_SEED="…" bun scripts/deploy.ts            # registry
POTDRIVE_SEED="…" KEEPER_SEED="…" bun scripts/deploy.ts --permits  # + gasless module, set as sponsor`} />
      <H3 id="revive-notes">Things we learned on Revive</H3>
      <ul>
        <li>A contract cannot create another contract inside a dry run or <code>eth_call</code> here, so end-to-end checks run each contract on its own.</li>
        <li>
          The public EVM RPC caps request bodies, so a block sent through <code>eth_call</code> must stay under about 32 KiB. Root blocks
          are a few hundred bytes.
        </li>
        <li>
          <code>block.number</code> is the Substrate block number and <code>block.chainid</code> is 420420777, so expiries and permits use
          the same numbers as TransactionStorage.
        </li>
      </ul>

      <H2 id="tests">Tests</H2>
      <p>
        32 Foundry tests run against fixtures the SDK generates (<code>bun scripts/contract-fixtures.ts</code>): real UnixFS roots, a
        website directory, forged and unsorted roots, and a permit signed with a real sr25519 key. A stand-in precompile computes real
        blake2b on the EVM&apos;s BLAKE2 F precompile, so local hashes equal Portaldot&apos;s. Then <code>bun scripts/onchain-check.ts</code>{" "}
        runs the checks against Portaldot itself:
      </p>
      <Code
        lang="text"
        title="bun scripts/onchain-check.ts"
        code={`✓ file root: blake2b + UnixFS decode  bafykbzacebwga3xh6… size 3150049 in 4 blocks, chain 420420777
✓ directory root  2 entries
✓ raw block hashed by the runtime  32768 bytes
✓ forged root refused  SizeMismatch()
✓ sr25519 wallet signature  owner 0xc7f9…1d26
✓ tampered permit rejected  signatureValid = false

all 6 checks passed on Portaldot V3 Testnet`}
      />
    </Doc>
  );
}
