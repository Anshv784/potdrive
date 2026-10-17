# Security model

PotDrive's goal: **no reader has to trust anyone for integrity.** Availability and chain state still come from a Portaldot node. The full write-up is at [potdrive.anshverma.tech/docs/security](https://potdrive.anshverma.tech/docs/security).

| Threat | Mitigation | Status |
|---|---|---|
| A node or the gateway returns tampered data | Every block is re-hashed against its CID before use. The gateway answers `502` on a mismatch. | Covered |
| A node withholds data | CIDs are node-independent, so query another Portaldot node | Availability depends on the node |
| Validators silently drop data | The runtime requires `checkProof` for data stored one retention period earlier | Covered by the chain |
| A stored website attacks PotDrive users | HTML, SVG and JS are served under `CSP: sandbox` without `allow-same-origin`, so the site gets an opaque origin with no cookies or storage. Verified in a browser. | Covered |
| Probing whether you stored a known file | Private files get a fresh key and IV, so their ciphertext never repeats or dedupes | Covered for private files |
| A private link leaks | The ciphertext stays public until it expires. Treat the link as the secret. | By design, documented |
| The upload key is stolen from the tab | It holds one upload's budget for a few blocks, then sweeps | Bounded |
| A tab closes mid-upload | The upload key is saved locally and the Drive offers to sweep it back | Covered |
| The keeper over-claims | Capped per file by its balance. Every claim is a public `Renewed` event. Owners can withdraw. | Bounded, trusted operator |
| The relay (gasless) is abused | Each authorization is wallet-signed, bound to one upload key and root, with a byte budget and an expiry | Bounded |
| A dishonest RPC misreports expiry or placements | Read from chain state through that RPC | Trusted. A light client would fix it. |

## Keys

- **Your wallet key** never leaves the extension. PotDrive asks for one signature per upload.
- **Upload keys** are generated in the tab and live for one upload.
- **Private-file keys** exist only in the link fragment and in the uploader's browser.
- **Inbox keys** (X25519) stay in the recipient's browser. Only the public half is published.
- **Keeper and relayer keys** are server secrets that can only renew, claim capped balances, or pay for authorized stores.

## Reporting

Please open a private security advisory on GitHub, or email the maintainer listed on the GitHub profile.
