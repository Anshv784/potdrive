<p align="center">
  <img src="https://raw.githubusercontent.com/Anshv784/potdrive/main/docs/assets/banner.png" alt="PotDrive" width="640">
</p>

<h2 align="center">@potdrive/sdk</h2>

<p align="center">
  Store files in Portaldot V3's <code>TransactionStorage</code> and read them back verified.<br>
  FastCDC chunking · blake2b IPFS CIDs · one-signature uploads · gasless uploads · wallet sharing · native NFTs · React bindings.
</p>

<p align="center">
  <a href="https://potdrive.anshverma.tech/docs/sdk"><img src="https://img.shields.io/badge/docs-API%20reference-4f46e5?style=for-the-badge" alt="API reference"></a>
  <a href="https://github.com/Anshv784/potdrive"><img src="https://img.shields.io/badge/source-GitHub-1d1d1f?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

```bash
npm install @potdrive/sdk
```

## Store a file

```ts
import { connect, prepareFile, uploadFile, shareUrl } from "@potdrive/sdk";

const api = await connect();                               // wss://test-node-v3.portaldot.dev
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });

const result = await uploadFile({
  api,
  file,
  owner: { address, signer },                              // a wallet extension signer, or a KeyringPair
  onEvent: (e) => console.log(e.type),                     // estimate · authorized · block · verified · swept · done
});

shareUrl("https://potdrive.anshverma.tech", result);
```

What happens: FastCDC splits the file by content. Each chunk gets a CIDv1 over `blake2b-256`, the digest Portaldot indexes. Chunks the chain already holds are skipped. Your wallet signs **one** batch, and a throwaway in-memory upload key stores each remaining chunk, then returns its unspent balance.

## Read it back, verified

```ts
import { getFile, resolvePath, readRange, stat } from "@potdrive/sdk";

const bytes = await getFile(cid);                          // every block re-hashed against its CID
const page  = await resolvePath(siteRoot, "assets/app.js");
const slice = await readRange(await stat(videoCid), 5_000_000, 6_000_000); // only the chunks it needs
```

## React

```tsx
import { PotImage, usePotFile } from "@potdrive/sdk/react";

<PotImage cid="bafk2bzace…" alt="" />
const { url, status, verified, total } = usePotFile(cid, { secret });   // secret = #k= of a private link
```

## Also included

| | |
|---|---|
| `prepareFolder` | UnixFS directories and static websites |
| `sealFile` / `openFile` | Private files: AES-256-GCM, with the name and type sealed too |
| `uploadSponsored` | Gasless uploads through Portaldot's MetaTx pallet and a relay |
| `sealToInbox` / `openFromInbox` | Share a private file to a wallet's X25519 inbox key |
| `planMint` / `mintCalls` / `ownedNfts` | NFTs on Portaldot's native Nfts pallet |
| `listStored` / `placements` / `renewFile` | What the chain holds, where, and renewals |
| `proofReport` | Recent storage proofs (`checkProof`, `ProofChecked`) |
| `cdcChunks` / `buildFileDag` / `cidFor` | The low-level pieces |

Full reference: **[potdrive.anshverma.tech/docs/sdk](https://potdrive.anshverma.tech/docs/sdk)** · MIT
