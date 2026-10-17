import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "NFTs" };

export default function Page() {
  return (
    <Doc href="/docs/nfts">
      <DocHeader
        eyebrow="Guides"
        title="NFTs on Portaldot"
        summary="Mint with Portaldot's native Nfts pallet. The media is stored by Portaldot too, so no part of the NFT depends on a pinning service."
      />

      <H2 id="flow">One signature</H2>
      <p>Mint as NFT on a file sends one <code>utility.batchAll</code>:</p>
      <ol>
        <li>
          <code>nfts.create</code> and <code>nfts.setCollectionMetadata</code> the first time. Your PotDrive collection is tagged so later mints reuse
          it.
        </li>
        <li>
          <code>nfts.mint(collection, item, you)</code>.
        </li>
        <li>
          <code>nfts.setMetadata(collection, item, json)</code>, with the metadata written straight into chain state.
        </li>
      </ol>
      <Code
        lang="json"
        title="item metadata (≤ 256 bytes, the pallet's StringLimit)"
        code={`{"name":"Field Notes","image":"ipfs://bafykbzace…","url":"https://potdrive.anshverma.tech/f/bafykbzace…","mime":"image/png","by":"PotDrive"}`}
      />
      <p>
        <code>image</code> points at a CID that Portaldot&apos;s own validators hold and prove. Anyone can resolve it through any Portaldot node&apos;s{" "}
        <code>bitswap_v1_get</code>, or through the gateway.
      </p>

      <H2 id="deposits">Deposits</H2>
      <table>
        <tbody>
          <tr><td>Collection</td><td>1 tPOT (once)</td></tr>
          <tr><td>Item</td><td>0.1 tPOT</td></tr>
          <tr><td>Metadata</td><td>0.1 tPOT + 0.06 tPOT per byte</td></tr>
        </tbody>
      </table>
      <p>Deposits are held, not spent, while the collection and item exist. When we checked on 17 October 2026, no Nfts collection existed on the V3 testnet yet.</p>

      <H2 id="sdk">From code</H2>
      <Code
        title="mint.ts"
        code={`const plan = await planMint(api, owner, { name: "Field Notes", image: \`ipfs://\${cid}\` });
await send(api, api.tx.utility.batchAll(mintCalls(api, owner, plan)), { address: owner, signer });
const mine = await ownedNfts(api, owner);`}
      />
    </Doc>
  );
}
