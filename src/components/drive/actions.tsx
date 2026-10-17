"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Gem, HeartPulse, Send } from "lucide-react";
import type { ApiPromise } from "@polkadot/api";
import type { Address, Hex } from "viem";
import { formatPot } from "@potdrive/sdk/network";
import { REGISTRY, SITE } from "@/lib/config";
import { signerOf, type InjectedAccount } from "@/lib/wallet";
import { loadInbox } from "@/lib/inbox";
import { bytes } from "@/lib/format";
import { Button, DocIcon, Group, Row, Segmented, Spinner } from "../ui";
import type { DriveFile } from "./drive";

// ---- shared sheet chrome ----

export function Sheet({ title, onClose, children, done }: { title: string; onClose: () => void; children: ReactNode; done?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[22px] bg-bg-2 shadow-float sm:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="material sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-sep px-4 py-3">
          <button onClick={onClose} className="justify-self-start text-[17px] text-link">
            {done ? "" : "Cancel"}
          </button>
          <div className="text-[17px] font-semibold">{title}</div>
          <button onClick={onClose} className="justify-self-end text-[17px] font-semibold text-link">
            {done ? "Done" : ""}
          </button>
        </div>
        <div className="space-y-6 px-4 pb-8 pt-6 sm:px-6">{children}</div>
      </motion.div>
    </div>
  );
}

function FileHeader({ f, icon }: { f: DriveFile; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      {icon ?? <DocIcon type={f.isPrivate ? "LOCK" : "FILE"} size={48} />}
      <div className="mt-3 max-w-full truncate text-[17px] font-semibold">{f.name || "Private file"}</div>
      <div className="text-[13px] text-label-2">{bytes(f.size)}</div>
    </div>
  );
}

function Result({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 text-[15px] ${ok ? "bg-green-soft" : "bg-red-soft"}`}>
      {ok && <Check className="mt-0.5 size-5 shrink-0 text-green" strokeWidth={3} />}
      <div>{children}</div>
    </div>
  );
}

const friendly = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  return /cancel|reject/i.test(m) ? "You cancelled the signature. Nothing was sent." : m;
};

async function contentRoot(cid: string): Promise<Hex> {
  const { contentHash, parseCid } = await import("@potdrive/sdk/cid");
  return contentHash(parseCid(cid));
}

// ---- mint as NFT (native Nfts pallet) ----

export function MintSheet({ f, api, account, onClose }: { f: DriveFile; api: ApiPromise | null; account: InjectedAccount; onClose: () => void }) {
  const [name, setName] = useState(f.name.replace(/\.[^.]+$/, "") || "Untitled");
  const [plan, setPlan] = useState<{ collection: number; item: number; newCollection: boolean; metadata: string } | null>(null);
  const [state, setState] = useState<"idle" | "signing" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const image = `ipfs://${f.root}`;

  useEffect(() => {
    if (!api) return;
    let live = true;
    import("@potdrive/sdk/nft").then(async ({ planMint }) => {
      const p = await planMint(api, account.address, { name, image, url: `${SITE}/f/${f.root}`, mime: f.mime });
      if (live) setPlan(p);
    });
    return () => {
      live = false;
    };
  }, [api, account.address, name, image, f.root, f.mime]);

  const deposit = plan ? (plan.newCollection ? 10n ** 14n + 6n * 10n ** 12n * 60n : 0n) + 10n ** 13n + 10n ** 13n + 6n * 10n ** 12n * BigInt(new TextEncoder().encode(plan.metadata).length) : null;

  const mint = async () => {
    if (!api || !plan) return;
    setState("signing");
    try {
      const [{ mintCalls }, { send }] = await Promise.all([import("@potdrive/sdk/nft"), import("@potdrive/sdk/tx")]);
      const signer = await signerOf(account.source);
      const inc = await send(api, api.tx.utility.batchAll(mintCalls(api, account.address, plan)), { address: account.address, signer });
      setMsg(`Minted item ${plan.item} in collection ${plan.collection}, block #${inc.blockNumber.toLocaleString("en-US")}.`);
      setState("done");
    } catch (e) {
      setMsg(friendly(e));
      setState("error");
    }
  };

  return (
    <Sheet title="Mint as NFT" onClose={onClose} done={state === "done"}>
      <FileHeader f={f} icon={<span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Gem className="size-7" /></span>} />
      <Group footer="Minted with Portaldot's native Nfts pallet. The metadata points at ipfs://<cid>, which Portaldot itself stores, so nothing about this NFT lives off-chain.">
        <div className="px-4 py-3">
          <label className="text-[13px] text-label-2" htmlFor="nft-name">Name</label>
          <input id="nft-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-transparent text-[17px] outline-none" />
        </div>
        <Row label="Media" detail={<span className="font-mono text-[12px]">ipfs://{f.root.slice(0, 10)}…</span>} />
        <Row label="Collection" detail={plan ? (plan.newCollection ? `New · #${plan.collection}` : `#${plan.collection}`) : "…"} />
        <Row label="Item" detail={plan ? `#${plan.item}` : "…"} />
      </Group>
      <Group title="Deposits" footer="Deposits are held, not spent, while the collection and item exist.">
        <Row label="Total deposits" detail={deposit === null ? <Spinner className="size-4 text-label-3" /> : `≈ ${formatPot(deposit, 2)} tPOT`} />
      </Group>
      {state === "done" && <Result ok>{msg}</Result>}
      {state === "error" && <Result ok={false}>{msg}</Result>}
      {state !== "done" && (
        <Button size="lg" className="w-full" disabled={!plan || state === "signing" || !api} onClick={mint}>
          {state === "signing" ? "Waiting for your wallet…" : "Mint"}
        </Button>
      )}
    </Sheet>
  );
}

// ---- share a private file with another wallet ----

export function ShareSheet({ f, api, account, onClose }: { f: DriveFile; api: ApiPromise | null; account: InjectedAccount; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const share = async () => {
    if (!api || !REGISTRY || !f.key) return;
    setState("working");
    try {
      const [{ evmAddressOf, readInboxKey, reviveCall, shareCalldata }, { sealToInbox }, { send }] = await Promise.all([
        import("@potdrive/sdk/registry"),
        import("@potdrive/sdk/share"),
        import("@potdrive/sdk/tx"),
      ]);
      const toEvm = (await evmAddressOf(api, to.trim())) as Address;
      const inbox = await readInboxKey(REGISTRY, toEvm);
      if (!inbox) throw new Error("That account hasn't set up a PotDrive inbox yet. Ask them to open the Drive once and turn on Receive shared files.");
      const root = await contentRoot(f.root);
      const sealed = await sealToInbox(f.key, inbox, root);
      const signer = await signerOf(account.source);
      const tx = await reviveCall(api, account.address, REGISTRY, shareCalldata(root, toEvm, sealed));
      await send(api, tx, { address: account.address, signer });
      setMsg("Shared. It now appears under Shared with me in their Drive, and only their browser can open it.");
      setState("done");
    } catch (e) {
      setMsg(friendly(e));
      setState("error");
    }
  };

  const blocked = !REGISTRY ? "Sharing to a wallet needs the registry contract, which isn't deployed on this build." : !f.registered ? "Only files recorded in the registry can be shared to a wallet." : !f.key ? "Only private files have a key to share. Public files can be shared with their link." : null;

  return (
    <Sheet title="Share with a Wallet" onClose={onClose} done={state === "done"}>
      <FileHeader f={f} icon={<span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Send className="size-7" /></span>} />
      <Group footer="The file key is sealed to the recipient's inbox key (X25519 + HKDF + AES-GCM) and published in a Shared event. Nobody else, including PotDrive, can read it.">
        <div className="px-4 py-3">
          <label className="text-[13px] text-label-2" htmlFor="share-to">Recipient address</label>
          <input id="share-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="5…" spellCheck={false} className="mt-1 w-full bg-transparent font-mono text-[14px] outline-none placeholder:text-label-3" />
        </div>
      </Group>
      {blocked && <Result ok={false}>{blocked}</Result>}
      {state === "done" && <Result ok>{msg}</Result>}
      {state === "error" && <Result ok={false}>{msg}</Result>}
      {state !== "done" && (
        <Button size="lg" className="w-full" disabled={!!blocked || to.trim().length < 46 || state === "working" || !api} onClick={share}>
          {state === "working" ? "Sealing and sending…" : "Share"}
        </Button>
      )}
    </Sheet>
  );
}

// ---- keep alive: anyone can fund a file's renewals ----

export function FundSheet({ f, api, account, onClose }: { f: DriveFile; api: ApiPromise | null; account: InjectedAccount; onClose: () => void }) {
  const [weeks, setWeeks] = useState(4);
  const [perRenewal, setPerRenewal] = useState<bigint | null>(null);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!api) return;
    let live = true;
    // A renewal costs what storing the same bytes costs: price it with the same fee model.
    import("@potdrive/sdk/upload").then(async ({ storeCall }) => {
      const sample = await storeCall(api, new Uint8Array(Math.min(f.size, 1 << 20))).paymentInfo(account.address);
      const perMiB = BigInt(sample.partialFee.toString());
      const fee = (perMiB * BigInt(Math.max(1, Math.ceil(f.size / (1 << 20))))) + 10n ** 12n * BigInt(f.blocks ?? 1);
      if (live) setPerRenewal(fee);
    });
    return () => {
      live = false;
    };
  }, [api, account.address, f.size, f.blocks]);

  const value = perRenewal === null ? null : (perRenewal * BigInt(weeks) * 110n) / 100n;

  const fund = async () => {
    if (!api || !REGISTRY || value === null) return;
    setState("working");
    try {
      const [{ fundCalldata, reviveCall }, { send }] = await Promise.all([import("@potdrive/sdk/registry"), import("@potdrive/sdk/tx")]);
      const signer = await signerOf(account.source);
      const tx = await reviveCall(api, account.address, REGISTRY, fundCalldata(await contentRoot(f.root)), value);
      await send(api, tx, { address: account.address, signer });
      setMsg(`Added ${weeks} week${weeks === 1 ? "" : "s"} of keep-alive. The keeper renews this file before it expires.`);
      setState("done");
    } catch (e) {
      setMsg(friendly(e));
      setState("error");
    }
  };

  const blocked = !REGISTRY ? "Keep-alive is held by the registry contract, which isn't deployed on this build." : !f.registered ? "This file isn't recorded in the registry, so it can't hold keep-alive. Renew it directly instead." : null;

  return (
    <Sheet title="Keep Alive" onClose={onClose} done={state === "done"}>
      <FileHeader f={f} icon={<span className="grid size-14 place-items-center rounded-2xl bg-green-soft text-green"><HeartPulse className="size-7" /></span>} />
      <Group title="Add" footer="Anyone can fund any file, not only its owner. The keeper can only take what each renewal costs, and the owner can withdraw the rest.">
        <div className="px-3 py-2.5">
          <Segmented label="Weeks" value={weeks} onChange={setWeeks} options={[1, 4, 12].map((w) => ({ value: w, label: `${w} week${w === 1 ? "" : "s"}` }))} />
        </div>
        <Row label="One renewal" detail={perRenewal === null ? <Spinner className="size-4 text-label-3" /> : `${formatPot(perRenewal, 2)} tPOT`} />
        <Row label={<span className="font-semibold">You add</span>} detail={<span className="font-semibold text-label">{value === null ? "…" : `${formatPot(value, 2)} tPOT`}</span>} />
      </Group>
      {blocked && <Result ok={false}>{blocked}</Result>}
      {state === "done" && <Result ok>{msg}</Result>}
      {state === "error" && <Result ok={false}>{msg}</Result>}
      {state !== "done" && (
        <Button size="lg" className="w-full" disabled={!!blocked || value === null || state === "working" || !api} onClick={fund}>
          {state === "working" ? "Waiting for your wallet…" : "Add Keep-Alive"}
        </Button>
      )}
    </Sheet>
  );
}

// ---- receive shared files: create + publish an inbox key ----

export function InboxSheet({ api, account, onClose }: { api: ApiPromise | null; account: InjectedAccount; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(loadInbox(account.address) ? "done" : "idle");
  const [msg, setMsg] = useState(loadInbox(account.address) ? "Your inbox is set up. Files shared with you appear under Shared with me." : "");

  const setup = async () => {
    if (!api || !REGISTRY) return;
    setState("working");
    try {
      const [{ newInbox }, { reviveCall, setInboxKeyCalldata }, { send }, { saveInbox }] = await Promise.all([
        import("@potdrive/sdk/share"),
        import("@potdrive/sdk/registry"),
        import("@potdrive/sdk/tx"),
        import("@/lib/inbox"),
      ]);
      const inbox = loadInbox(account.address) ?? newInbox();
      saveInbox(account.address, inbox);
      const signer = await signerOf(account.source);
      const tx = await reviveCall(api, account.address, REGISTRY, setInboxKeyCalldata(inbox.publicKey));
      await send(api, tx, { address: account.address, signer });
      setMsg("Inbox published. Others can now share private files with this address.");
      setState("done");
    } catch (e) {
      setMsg(friendly(e));
      setState("error");
    }
  };

  return (
    <Sheet title="Receive Shared Files" onClose={onClose} done={state === "done"}>
      <p className="text-center text-[15px] text-label-2">
        PotDrive creates an X25519 key pair on this device and publishes only the public half to the registry. People can then seal private files to
        your address. The private half stays in this browser.
      </p>
      {!REGISTRY && <Result ok={false}>Needs the registry contract, which isn&apos;t deployed on this build.</Result>}
      {state === "done" && <Result ok>{msg}</Result>}
      {state === "error" && <Result ok={false}>{msg}</Result>}
      {state !== "done" && (
        <Button size="lg" className="w-full" disabled={!REGISTRY || state === "working" || !api} onClick={setup}>
          {state === "working" ? "Waiting for your wallet…" : "Set Up Inbox"}
        </Button>
      )}
    </Sheet>
  );
}
