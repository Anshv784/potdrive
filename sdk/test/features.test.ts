import { beforeAll, describe, expect, test } from "bun:test";
import { Keyring } from "@polkadot/keyring";
import { stringToU8a, u8aToHex, u8aWrapBytes } from "@polkadot/util";
import { cryptoWaitReady } from "@polkadot/util-crypto";
import { newInbox, openFromInbox, sealToInbox } from "../src/share";
import { sponsorMessage, verifySponsorAuth, type SponsorAuth } from "../src/metatx";
import { nftMetadata } from "../src/nft";

beforeAll(async () => {
  await cryptoWaitReady();
});

const root = `0x${"ab".repeat(32)}` as const;

describe("share to a wallet inbox", () => {
  test("the recipient opens the file key; nobody else can", async () => {
    const bob = newInbox();
    const eve = newInbox();
    const sealed = await sealToInbox("file-key-123", bob.publicKey, root);
    expect(await openFromInbox(sealed, bob.privateKey, root)).toBe("file-key-123");
    await expect(openFromInbox(sealed, eve.privateKey, root)).rejects.toThrow("not sealed to your inbox");
  });

  test("a share is bound to its file root", async () => {
    const bob = newInbox();
    const sealed = await sealToInbox("k", bob.publicKey, root);
    await expect(openFromInbox(sealed, bob.privateKey, `0x${"cd".repeat(32)}`)).rejects.toThrow();
  });

  test("sealing twice gives different ciphertext", async () => {
    const bob = newInbox();
    expect(await sealToInbox("k", bob.publicKey, root)).not.toBe(await sealToInbox("k", bob.publicKey, root));
  });
});

describe("sponsored upload authorization", () => {
  const kr = new Keyring({ type: "sr25519", ss58Format: 42 });
  const auth = (account: string): SponsorAuth => ({ account, uploadKey: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", root: "bafk2bzace", bytes: 1000, expires: 99 });

  test("accepts a raw signature and a wallet-wrapped one", () => {
    const alice = kr.addFromUri("//Alice");
    const a = auth(alice.address);
    const msg = stringToU8a(sponsorMessage(a));
    expect(verifySponsorAuth(a, u8aToHex(alice.sign(msg)))).toBe(true);
    expect(verifySponsorAuth(a, u8aToHex(alice.sign(u8aWrapBytes(msg))))).toBe(true);
  });

  test("rejects a tampered budget or another signer", () => {
    const alice = kr.addFromUri("//Alice");
    const mallory = kr.addFromUri("//Mallory");
    const a = auth(alice.address);
    const sig = u8aToHex(alice.sign(stringToU8a(sponsorMessage(a))));
    expect(verifySponsorAuth({ ...a, bytes: 10_000_000 }, sig)).toBe(false);
    expect(verifySponsorAuth(a, u8aToHex(mallory.sign(stringToU8a(sponsorMessage(a)))))).toBe(false);
  });
});

describe("NFT metadata", () => {
  test("fits the Nfts pallet StringLimit (256 bytes)", () => {
    const cid = "bafykbzaceddrtwlqwcpmmwwfvv5rdj5uvql37dldcnjcg4vcginmrablk7et6";
    const long = nftMetadata({ name: "A".repeat(300), image: `ipfs://${cid}`, url: `https://potdrive.anshverma.tech/f/${cid}`, mime: "image/png" });
    expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(256);
    expect(JSON.parse(long).image).toBe(`ipfs://${cid}`);
    const short = JSON.parse(nftMetadata({ name: "Cat", image: `ipfs://${cid}`, mime: "image/png" }));
    expect(short.name).toBe("Cat");
    expect(short.by).toBe("PotDrive");
  });
});
