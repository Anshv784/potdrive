"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { ApiPromise } from "@polkadot/api";
import { encodeAbiParameters, type Address, type Hex } from "viem";
import type { InjectedAccount } from "@/lib/wallet";
import { ConnectCard } from "./drive/connect";
import { Button, Spinner } from "./ui";
import { CopyButton } from "./code";

// Deploys the registry (and optionally the permit module) from a browser wallet: the extension
// signs revive.instantiateWithCode, so no recovery phrase ever touches a terminal or a server.

// Renewals cost what storing costs (~0.1135 tPOT/KiB); the keeper may claim 1.5x per stored byte.
const FEE_CAP = 166_000_000_000_000n;
const PLANCK = 10n ** 14n;
const pot = (v: bigint) => (Number(v / 10n ** 10n) / 10_000).toLocaleString("en-US", { maximumFractionDigits: 2 });

type Dry = { weight: { refTime: bigint; proofSize: bigint }; deposit: bigint; ok: boolean; error?: string };
type Done = { address: Address; block: number; hash: string };

async function dryRun(api: ApiPromise, origin: string, code: Hex): Promise<Dry> {
  const r = (await api.call.reviveApi.instantiate(origin, 0, null, null, { Upload: code }, "0x", null)).toJSON() as {
    weightRequired: { refTime: number; proofSize: number };
    storageDeposit: { charge?: number };
    maxStorageDeposit?: { charge?: number };
    result: { ok?: { result: { flags: { bits: number } | number } }; err?: unknown };
  };
  const flags = r.result.ok?.result.flags;
  const reverted = flags !== undefined && ((typeof flags === "number" ? flags : flags.bits) & 1) === 1;
  return {
    weight: { refTime: BigInt(r.weightRequired.refTime), proofSize: BigInt(r.weightRequired.proofSize) },
    deposit: BigInt(r.maxStorageDeposit?.charge ?? r.storageDeposit.charge ?? 0),
    ok: !!r.result.ok && !reverted,
    error: r.result.err ? JSON.stringify(r.result.err) : reverted ? "constructor reverted" : undefined,
  };
}

export function DeployConsole() {
  const [account, setAccount] = useState<InjectedAccount | null>(null);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [keeper, setKeeper] = useState<Address | null>(null);
  const [dry, setDry] = useState<Dry | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registry, setRegistry] = useState<Done | null>(null);
  const [permits, setPermits] = useState<Done | null>(null);
  const [permitsDry, setPermitsDry] = useState<Dry | null>(null);

  // Connect, read balance and the deployer's Revive address, dry-run the registry deploy.
  useEffect(() => {
    if (!account) return;
    let live = true;
    (async () => {
      try {
        const [{ connect }, { registryBytecode }] = await Promise.all([import("@potdrive/sdk/chain"), import("@potdrive/sdk/abi")]);
        const a = await connect();
        if (!live) return;
        setApi(a);
        const info = (await a.query.system.account(account.address)).toJSON() as { data: { free: string | number } };
        const k = (await a.call.reviveApi.address(account.address)).toString() as Address;
        if (!live) return;
        setBalance(BigInt(info.data.free));
        setKeeper(k);
        const code = (registryBytecode + encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [k, FEE_CAP]).slice(2)) as Hex;
        setDry(await dryRun(a, account.address, code));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      live = false;
    };
  }, [account]);

  const instantiate = async (code: Hex, d: Dry): Promise<Done> => {
    const [{ send }, { signerOf }] = await Promise.all([import("@potdrive/sdk/tx"), import("@/lib/wallet")]);
    const tx = api!.tx.revive.instantiateWithCode(
      0,
      { refTime: d.weight.refTime * 2n, proofSize: d.weight.proofSize * 2n },
      (d.deposit * 12n) / 10n + 1n,
      code,
      "0x",
      null,
    );
    const inc = await send(api!, tx, { address: account!.address, signer: await signerOf(account!.source) });
    const ev = inc.events.find(({ event }) => api!.events.revive.Instantiated.is(event));
    if (!ev) throw new Error("Deployed, but no Instantiated event was found");
    return { address: ev.event.data[1].toString() as Address, block: inc.blockNumber, hash: inc.hash };
  };

  const deployRegistry = async () => {
    setError(null);
    setBusy("registry");
    try {
      const { registryBytecode, permitsBytecode } = await import("@potdrive/sdk/abi");
      const code = (registryBytecode + encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [keeper!, FEE_CAP]).slice(2)) as Hex;
      const done = await instantiate(code, dry!);
      setRegistry(done);
      const pcode = (permitsBytecode + encodeAbiParameters([{ type: "address" }], [done.address]).slice(2)) as Hex;
      setPermitsDry(await dryRun(api!, account!.address, pcode));
      const info = (await api!.query.system.account(account!.address)).toJSON() as { data: { free: string | number } };
      setBalance(BigInt(info.data.free));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const deployPermits = async () => {
    setError(null);
    setBusy("permits");
    try {
      const [{ permitsBytecode, registryAbi }, { reviveCall }, { send }, { signerOf }, { encodeFunctionData }] = await Promise.all([
        import("@potdrive/sdk/abi"),
        import("@potdrive/sdk/registry"),
        import("@potdrive/sdk/tx"),
        import("@/lib/wallet"),
        import("viem"),
      ]);
      const pcode = (permitsBytecode + encodeAbiParameters([{ type: "address" }], [registry!.address]).slice(2)) as Hex;
      const done = await instantiate(pcode, permitsDry!);
      const data = encodeFunctionData({ abi: registryAbi, functionName: "setSponsor", args: [done.address] });
      await send(api!, await reviveCall(api!, account!.address, registry!.address, data), {
        address: account!.address,
        signer: await signerOf(account!.source),
      });
      setPermits(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!account) return <ConnectCard onPick={setAccount} />;

  const enough = balance !== null && dry ? balance > dry.deposit + PLANCK : false;
  const env = registry
    ? [`NEXT_PUBLIC_REGISTRY=${registry.address}`, `NEXT_PUBLIC_REGISTRY_BLOCK=${registry.block}`, ...(permits ? [`NEXT_PUBLIC_PERMITS=${permits.address}`] : [])].join("\n")
    : "";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="rounded-2xl bg-bg-2 p-5 text-[14px]">
        <div className="flex justify-between gap-4">
          <span className="text-label-2">Deployer</span>
          <span className="truncate font-mono text-[12px]">{account.address}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-label-2">Balance</span>
          <span className="tabular">{balance === null ? "…" : `${pot(balance)} tPOT`}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-label-2">Keeper (this account)</span>
          <span className="truncate font-mono text-[12px]">{keeper ?? "…"}</span>
        </div>
      </div>

      {/* step 1: registry */}
      <div className="rounded-2xl bg-surface p-5 ring-1 ring-sep">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">1 · PotDriveRegistry</div>
            <div className="text-[13px] text-label-2">
              {!dry ? "Dry-running the deploy…" : dry.ok ? `Refundable deposit ≈ ${pot(dry.deposit)} tPOT` : `Dry run failed: ${dry.error}`}
            </div>
          </div>
          {registry ? (
            <Check className="size-6 text-green" />
          ) : (
            <Button onClick={deployRegistry} disabled={!dry?.ok || !enough || !!busy}>
              {busy === "registry" ? <Spinner className="size-4" /> : "Deploy"}
            </Button>
          )}
        </div>
        {dry?.ok && !enough && !registry && <p className="mt-3 text-[13px] text-orange">Not enough tPOT for the deposit yet.</p>}
        {registry && (
          <div className="mt-3 space-y-1 font-mono text-[12px] text-label-2">
            <div>address {registry.address}</div>
            <div>block #{registry.block}</div>
            <div className="break-all">tx {registry.hash}</div>
          </div>
        )}
      </div>

      {/* step 2: optional permits */}
      {registry && (
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-sep">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[16px] font-semibold">2 · PotDrivePermits (optional)</div>
              <div className="text-[13px] text-label-2">
                {!permitsDry ? "…" : `Gasless registration. Deposit ≈ ${pot(permitsDry.deposit)} tPOT. Skip it until you have the tPOT.`}
              </div>
            </div>
            {permits ? (
              <Check className="size-6 text-green" />
            ) : (
              <Button
                variant="gray"
                onClick={deployPermits}
                disabled={!permitsDry?.ok || !!busy || balance === null || balance < (permitsDry?.deposit ?? 0n) + PLANCK}
              >
                {busy === "permits" ? <Spinner className="size-4" /> : "Deploy"}
              </Button>
            )}
          </div>
        </div>
      )}

      {registry && (
        <div className="rounded-2xl bg-green-soft p-5">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">Send these to Claude</div>
            <CopyButton text={env} label="Copy" />
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-relaxed">{env}</pre>
          <a
            href={`https://node-console.portaldot.dev/#/explorer/query/${registry.block}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[13px] text-link hover:underline"
          >
            See the block <ExternalLink className="size-3.5" />
          </a>
        </div>
      )}

      {error && <p className="rounded-xl bg-bg-2 p-4 text-[13px] text-red">{error}</p>}
    </div>
  );
}
