# @potdrive/sdk

Store files in Portaldot V3's `TransactionStorage`: FastCDC chunking, blake2b-256 IPFS CIDs, one-signature uploads, sponsored (gasless) uploads through the MetaTx pallet, verified reads, wallet-to-wallet sharing and native NFTs.

```ts
import { connect, prepareFile, uploadFile, getFile } from "@potdrive/sdk";

const api = await connect();
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });
const { root } = await uploadFile({ api, file, owner: { address, signer } });

const back = await getFile(root); // every block re-hashed
```

```tsx
import { PotImage, usePotFile } from "@potdrive/sdk/react";

<PotImage cid="bafk2bzace…" alt="Stored on Portaldot" />
```

Docs: https://potdrive.anshverma.tech/docs/sdk
