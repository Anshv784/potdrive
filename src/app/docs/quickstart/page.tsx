import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Quickstart" };

export default function Page() {
  return (
    <Doc href="/docs/quickstart">
      <DocHeader eyebrow="Get started" title="Quickstart" summary="Store and share your first file on Portaldot, from the Drive, the SDK or the terminal." />

      <H2 id="before">Before you start</H2>
      <ol>
        <li>Install a Polkadot wallet extension: Talisman, SubWallet or polkadot&#123;.js&#125;.</li>
        <li>Create an account. Portaldot uses generic Substrate addresses (SS58 prefix 42), which start with a 5.</li>
        <li>
          Get test POT. During the Hacker House, the Portaldot team sends tPOT to the native address you register on DoraHacks;
          otherwise open a ticket in the Portaldot Discord.
        </li>
      </ol>
      <Callout kind="important" title="Budget">
        Storage on the V3 testnet costs about 105 tPOT per MiB, mostly the transaction length fee. A few hundred tPOT covers a
        handful of small files. See <a href="/docs/limits">Costs and limits</a>.
      </Callout>

      <H2 id="drive">Use the Drive</H2>
      <ol>
        <li>
          Open <a href="/drive">Drive</a> and connect your wallet.
        </li>
        <li>Drop a file, or choose Folder to upload a directory or a built website.</li>
        <li>Review the cost. Blocks Portaldot already holds are listed separately and not charged again.</li>
        <li>Approve one transaction. PotDrive stores every block, verifies the result from the chain, and returns unspent tPOT.</li>
        <li>Share the link. Readers verify every block in their own browser.</li>
      </ol>

      <H2 id="sdk">Use the SDK</H2>
      <p>
        The SDK lives in <code>sdk/src</code> of the repository and runs in browsers, Bun, Node and serverless functions.
      </p>
      <Code
        title="store.ts"
        code={`import { connect, prepareFile, uploadFile, shareUrl } from "@potdrive/sdk";

const api = await connect();                         // wss://test-node-v3.portaldot.dev
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });

const result = await uploadFile({
  api,
  file,
  owner: { address, signer },                        // injected signer or a KeyringPair
  onEvent: (e) => console.log(e.type),
});

console.log(shareUrl("https://potdrive.anshverma.tech", result));`}
      />
      <H3 id="read">Read it back</H3>
      <Code
        title="read.ts"
        code={`import { getFile } from "@potdrive/sdk";

const bytes = await getFile("bafykbzace…");          // every block re-hashed before it is returned`}
      />

      <H2 id="cli">Use the CLI</H2>
      <Code
        lang="bash"
        title="Terminal"
        code={`git clone https://github.com/Anshv784/potdrive && cd potdrive && bun install
export POTDRIVE_SEED="your twelve words …"

bun cli/potdrive.ts put ./deck.pdf          # store a file, print its link
bun cli/potdrive.ts deploy ./dist           # store a whole site, print its URL
bun cli/potdrive.ts get <cid> -o deck.pdf   # fetch and verify`}
      />
    </Doc>
  );
}
