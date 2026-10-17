import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import type { KeyringPair } from "@polkadot/keyring/types";
import type { Signer } from "@polkadot/types/types";
import type { DispatchError, EventRecord } from "@polkadot/types/interfaces";

export interface Included {
  hash: string;
  blockHash: string;
  blockNumber: number;
  extrinsicIndex: number;
  events: EventRecord[];
}

export class TxFailed extends Error {}

export type Account = KeyringPair | { address: string; signer: Signer };

function decodeError(api: ApiPromise, events: EventRecord[]): string | undefined {
  for (const { event } of events) {
    if (!api.events.system.ExtrinsicFailed.is(event)) continue;
    const err = event.data[0] as DispatchError;
    if (err.isModule) {
      const meta = api.registry.findMetaError(err.asModule);
      return `${meta.section}.${meta.name}`;
    }
    return err.toString();
  }
}

// Resolves once the extrinsic is in a block (≈6s on Portaldot); finality is reported
// separately so the UI can move on without waiting for GRANDPA.
export function send(
  api: ApiPromise,
  tx: SubmittableExtrinsic<"promise">,
  account: Account,
  opts: { nonce?: number; onFinalized?: (i: Included) => void; onBroadcast?: (hash: string) => void } = {},
): Promise<Included> {
  return new Promise((resolve, reject) => {
    let included: Included | undefined;
    let unsub: (() => void) | undefined;
    let done = false;
    const stop = () => {
      done = true;
      unsub?.();
    };
    const signerArgs = "signer" in account && !("sign" in account) ? { signer: account.signer } : {};
    const who = "sign" in account ? account : account.address;
    tx.signAndSend(who, { nonce: opts.nonce ?? -1, ...signerArgs }, async (result) => {
      if (result.isError) {
        stop();
        reject(new TxFailed(`Transaction ${result.status.type.toLowerCase()}`));
        return;
      }
      if (result.status.isBroadcast) opts.onBroadcast?.(tx.hash.toHex());
      if (result.status.isInBlock && !included) {
        const blockHash = result.status.asInBlock.toHex();
        const failure = decodeError(api, result.events);
        if (failure) {
          stop();
          reject(new TxFailed(failure));
          return;
        }
        const header = await api.rpc.chain.getHeader(blockHash);
        const extrinsicIndex = result.events.find((e) => e.phase.isApplyExtrinsic)?.phase.asApplyExtrinsic.toNumber() ?? -1;
        included = { hash: tx.hash.toHex(), blockHash, blockNumber: header.number.toNumber(), extrinsicIndex, events: result.events };
        resolve(included);
      }
      if (result.status.isFinalized && included) {
        stop();
        opts.onFinalized?.(included);
      }
    })
      .then((u) => (done ? u() : (unsub = u)))
      .catch(reject);
  });
}
