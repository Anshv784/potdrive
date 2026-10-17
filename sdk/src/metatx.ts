import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import { compactToU8a, u8aConcat, u8aToHex, u8aToU8a, stringToU8a, u8aWrapBytes } from "@polkadot/util";
import { blake2AsU8a, signatureVerify } from "@polkadot/util-crypto";

// Meta-transactions through Portaldot's MetaTx pallet. The signer authorizes a call; a
// relayer submits metaTx.dispatch and pays the transaction fee.
//
// Portaldot V3 meta-tx extension pipeline (from runtime metadata):
//   (VerifySignature, MetaTxMarker, CheckNonZeroSender, CheckSpecVersion, CheckTxVersion,
//    CheckGenesis, CheckMortality, CheckNonce, CheckMetadataHash)
// VerifySignature checks blake2_256 of everything after it:
//   (extension_version, call, explicit of the rest, implicit of the rest)
// which is how pallet-meta-tx's own tests build the signature.

export const META_EXTENSION_VERSION = 0;

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

export interface MetaTxParts {
  call: Uint8Array;
  nonce: number;
  payload: Uint8Array;
}

export async function metaTxPayload(api: ApiPromise, signer: string, call: SubmittableExtrinsic<"promise">, nonce?: number): Promise<MetaTxParts> {
  const n = nonce ?? (await api.rpc.system.accountNextIndex(signer)).toNumber();
  const callU8 = call.method.toU8a();
  const genesis = api.genesisHash.toU8a();
  const explicit = u8aConcat(
    new Uint8Array([0x00]), // CheckMortality: immortal era
    compactToU8a(n), // CheckNonce
    new Uint8Array([0x00]), // CheckMetadataHash: mode Disabled
  );
  const implicit = u8aConcat(
    u32le(api.runtimeVersion.specVersion.toNumber()), // CheckSpecVersion
    u32le(api.runtimeVersion.transactionVersion.toNumber()), // CheckTxVersion
    genesis, // CheckGenesis
    genesis, // CheckMortality: birth block of an immortal era
    new Uint8Array([0x00]), // CheckMetadataHash: None
  );
  return { call: callU8, nonce: n, payload: u8aConcat(new Uint8Array([META_EXTENSION_VERSION]), callU8, explicit, implicit) };
}

// Signs with a local key (raw sr25519 over the 32-byte hash, no wrapping), which is why the
// upload key signs meta-txs: browser wallets wrap raw messages in <Bytes>.
export async function signMetaTx(api: ApiPromise, signer: KeyringPair, call: SubmittableExtrinsic<"promise">, nonce?: number) {
  const parts = await metaTxPayload(api, signer.address, call, nonce);
  const signature = signer.sign(blake2AsU8a(parts.payload, 256));
  const metaTx = api.createType("PalletMetaTxMetaTx", {
    call: parts.call,
    extensionVersion: META_EXTENSION_VERSION,
    extension: [{ Signed: { signature: { Sr25519: signature }, account: signer.address } }, null, null, null, null, null, "0x00", parts.nonce, { mode: "Disabled" }],
  });
  return { metaTx, hex: metaTx.toHex(), length: metaTx.encodedLength, nonce: parts.nonce };
}

export interface DecodedMetaTx {
  call: { section: string; method: string; args: unknown[] };
  extension: unknown;
  encodedLength: number;
  toHex(): string;
}

export function dispatchMetaTx(api: ApiPromise, metaTxHex: string) {
  const metaTx = api.createType("PalletMetaTxMetaTx", metaTxHex) as unknown as DecodedMetaTx;
  return { tx: api.tx.metaTx.dispatch(metaTx as never, metaTx.encodedLength), metaTx };
}

// ---- sponsorship authorization, signed once by the user's wallet ----

export interface SponsorAuth {
  account: string;
  uploadKey: string;
  root: string;
  bytes: number;
  expires: number; // block number
}

export function sponsorMessage(a: SponsorAuth): string {
  return [
    "PotDrive sponsored upload",
    `account: ${a.account}`,
    `upload key: ${a.uploadKey}`,
    `root: ${a.root}`,
    `bytes: ${a.bytes}`,
    `expires at block: ${a.expires}`,
  ].join("\n");
}

// Wallets sign raw messages wrapped in <Bytes>…</Bytes>; accept either form.
export function verifySponsorAuth(a: SponsorAuth, signature: string): boolean {
  const msg = stringToU8a(sponsorMessage(a));
  return [msg, u8aWrapBytes(msg)].some((m) => {
    try {
      return signatureVerify(m, signature, a.account).isValid;
    } catch {
      return false;
    }
  });
}

export function metaTxSigner(metaTx: { extension: unknown }): string | null {
  const ext = (metaTx.extension as unknown as { [0]: { isSigned?: boolean; asSigned?: { account: { toString(): string } } } })[0];
  return ext?.isSigned ? ext.asSigned!.account.toString() : null;
}

export { u8aToHex, u8aToU8a };
