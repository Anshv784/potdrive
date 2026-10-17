import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2, H3 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Gasless uploads" };

export default function Page() {
  return (
    <Doc href="/docs/sponsored">
      <DocHeader
        eyebrow="Guides"
        title="Gasless uploads"
        summary="New users have 0 tPOT. Sponsored uploads let them store files anyway: they sign, a relay pays, through Portaldot's MetaTx pallet."
      />

      <H2 id="how">How it works</H2>
      <ol>
        <li>
          The Drive prepares the file and generates an in-tab upload key, exactly like a normal upload.
        </li>
        <li>
          Your wallet signs one readable message that authorizes the upload key for one root and a byte budget until a block number:
        </li>
      </ol>
      <Code
        lang="text"
        title="What your wallet shows"
        code={`PotDrive sponsored upload
account: 5CX7xVi2a478v9TgQJ65A1cgWpVwbozohGjdS4gPbH2mKhc6
upload key: 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty
root: bafykbzace…
bytes: 412377
expires at block: 77912`}
      />
      <ol start={3}>
        <li>The relay checks that signature (raw or wallet-wrapped), then funds the upload key with 0.11 tPOT for its existential deposit and the pallet&apos;s tiny per-byte fee.</li>
        <li>
          For each block, the upload key signs a <strong>meta-transaction</strong> for <code>transactionStorage.store</code>. The relay checks that the
          signer is the authorized key, that the call is <code>store</code>, and that the budget holds. Then it submits{" "}
          <code>metaTx.dispatch</code> and pays the transaction fee.
        </li>
      </ol>

      <H2 id="format">The meta-transaction</H2>
      <p>Portaldot V3&apos;s MetaTx extension pipeline, read from runtime metadata:</p>
      <Code
        lang="text"
        title="PalletMetaTxMetaTx.extension"
        code={`(VerifySignature, MetaTxMarker, CheckNonZeroSender, CheckSpecVersion, CheckTxVersion,
 CheckGenesis, CheckMortality, CheckNonce, CheckMetadataHash)`}
      />
      <p>
        <code>VerifySignature</code> checks a signature over <code>blake2_256</code> of everything after it: the extension version, the call, then
        the explicit and implicit data of the remaining extensions. That matches <code>pallet-meta-tx</code>&apos;s own tests.
      </p>
      <Code
        title="sdk/src/metatx.ts"
        code={`payload = 0x00                         // extension version
        ‖ call
        ‖ 0x00 ‖ compact(nonce) ‖ 0x00   // era immortal, nonce, metadata-hash mode off
        ‖ u32(spec) ‖ u32(txVersion) ‖ genesis ‖ genesis ‖ 0x00
signature = sr25519.sign(blake2_256(payload))`}
      />
      <H3 id="why-key">Why the upload key signs, not the wallet</H3>
      <p>
        Browser wallets wrap any raw message in <code>&lt;Bytes&gt;…&lt;/Bytes&gt;</code> before signing it, so they can&apos;t produce the bare signature{" "}
        <code>VerifySignature</code> expects. The wallet signs the human-readable authorization instead, and the key it authorizes signs the
        meta-transactions.
      </p>

      <H2 id="limits">Limits</H2>
      <ul>
        <li>Up to <code>RELAY_MAX_BYTES</code> of new data per authorization (256 KiB by default). Deduplicated blocks don&apos;t count.</li>
        <li>Authorizations expire after 300 blocks, about 30 minutes.</li>
        <li>Sponsored files are not registered, so they have no keep-alive. Re-upload with your own tPOT to register one.</li>
      </ul>
      <Callout kind="note" title="Status">
        The relay is live code, but it needs a funded <code>RELAYER_SEED</code>. Until the deployment&apos;s relayer is funded, the Drive hides the
        Sponsored option. The payload encoding is unit-tested for round-trip and signer recovery, and it is verified against the chain the
        first time the relayer runs.
      </Callout>
    </Doc>
  );
}
