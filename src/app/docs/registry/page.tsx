import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Registry contract" };

export default function Page() {
  return (
    <Doc href="/docs/registry">
      <DocHeader
        eyebrow="Reference"
        title="PotDriveRegistry"
        summary="Ownership and prepaid keep-alive for stored files. Solidity, deployed to Portaldot's Revive pallet as EVM bytecode, called from a Polkadot wallet."
      />

      <H2 id="why-revive">Why on Revive</H2>
      <p>
        The bytes live on the native side, in TransactionStorage. The index lives on Portaldot&apos;s EVM side, so any EVM tool
        can read it with <code>eth_call</code> and <code>eth_getLogs</code>. PotDrive calls it with <code>revive.call</code> inside
        the same <code>utility.batchAll</code> as the upload, so one Polkadot signature does both. Your EVM identity is your
        account&apos;s mapped H160 from <code>reviveApi.address</code>. Revive runs with <code>AutoMap = true</code>.
      </p>

      <H2 id="interface">Interface</H2>
      <Code
        lang="solidity"
        title="PotDriveRegistry.sol"
        code={`function register(bytes32 root, uint64 size, uint32 chunks, bool isPrivate, string name, string mime,
                  bytes32 parent) payable;                       // parent = previous version, or zero
function fund(bytes32 root) payable;                            // anyone
function renewed(bytes32 root, uint32 expiresAt, uint256 cost); // keeper only, capped by the file's balance
function withdraw(bytes32 root);                                // owner takes back unused keep-alive
function transfer(bytes32 root, address to);                    // owner
function setListed(bytes32 root, bool listed);                  // owner
function setInboxKey(bytes32 key);                              // X25519 public key for receiving shares
function share(bytes32 root, address to, bytes sealedKey);      // owner: file key sealed to to's inbox
function fileOf(bytes32 root) view returns (address owner, uint64 size, uint32 chunks,
    uint32 storedAt, uint32 expiresAt, uint256 keepAlive, bool isPrivate, bool listed);

event Registered(bytes32 indexed root, address indexed owner, uint64 size, uint32 chunks,
                 bool isPrivate, string name, string mime, bytes32 parent);
event Shared(bytes32 indexed root, address indexed from, address indexed to, bytes sealedKey);
event InboxKeySet(address indexed owner, bytes32 key);
event Funded(bytes32 indexed root, address indexed from, uint256 amount, uint256 balance);
event Renewed(bytes32 indexed root, uint32 expiresAt, uint256 cost, address indexed keeper);
event Withdrawn(bytes32 indexed root, address indexed owner, uint256 amount);
event Transferred(bytes32 indexed root, address indexed from, address indexed to);
event Listed(bytes32 indexed root, bool listed);`}
      />
      <p>
        <code>root</code> is the root block&apos;s 32-byte blake2b digest, the same value TransactionStorage writes into{" "}
        <code>content_hash</code>. <code>chunks &gt; 1</code> means the root is <code>dag-pb</code>, which is how readers rebuild
        the CID from a record.
      </p>

      <H2 id="layout">Storage layout and deposits</H2>
      <p>
        Revive charges a storage deposit per byte and per item (<code>DepositPerByte = 0.06 tPOT</code>,{" "}
        <code>DepositPerItem = 0.15 tPOT</code>). We designed the contract around that:
      </p>
      <ul>
        <li>
          A record is two packed slots: <code>owner | size | flags</code> and{" "}
          <code>chunks | storedAt | expiresAt | keepAlive(uint128)</code>.
        </li>
        <li>Names, types and listings are event logs, which cost no deposit. Lists are rebuilt with <code>eth_getLogs</code>.</li>
        <li>
          Compiled with <code>via_ir</code> and <code>optimizer_runs = 1</code>. The runtime bytecode is about 3 KB with versions and
          sharing, down from 7,136 bytes in the first version. Slimming the first version cut the deployment deposit from about 578 tPOT to
          about 224 tPOT, measured with a <code>reviveApi.instantiate</code> dry run. Versions and shares are events, so they add no per-file
          deposit.
        </li>
      </ul>

      <H2 id="deploy">Deploying through Revive</H2>
      <Callout kind="important" title="EVM constructors on Revive">
        Constructor arguments must be appended to the init code, and the <code>data</code> argument of{" "}
        <code>instantiateWithCode</code> must be empty. Passing them separately fails with <code>EvmConstructorNonEmptyData</code>{" "}
        (Revive error 54).
      </Callout>
      <Code
        title="scripts/deploy.ts"
        code={`const args = encodeAbiParameters([{ type: "address" }], [keeper]);
const code = registryBytecode + args.slice(2);           // args ride on the initcode
const dry  = await api.call.reviveApi.instantiate(deployer, 0, null, null, { Upload: code }, "0x", null);
await send(api, api.tx.revive.instantiateWithCode(0, weight, depositLimit, code, "0x", null), deployer);`}
      />

      <H2 id="tests">Tests</H2>
      <p>
        Twelve Foundry tests cover ownership, expiry, private-by-default listing, re-registration, empty files, funding by third
        parties, keeper reimbursement and its cap, owner-only withdraw, transfers, version links, inbox keys and owner-only sharing. Run them with{" "}
        <code>cd contracts &amp;&amp; forge test</code>.
      </p>
    </Doc>
  );
}
