import { ApiPromise, HttpProvider, WsProvider } from "@polkadot/api";
import { NETWORK } from "./network";

const apis = new Map<string, Promise<ApiPromise>>();

// One shared connection per endpoint. Use http:// endpoints in stateless runtimes
// (route handlers, workers) and wss:// where subscriptions are needed.
export function connect(url: string = NETWORK.ws): Promise<ApiPromise> {
  let api = apis.get(url);
  if (!api) {
    const provider = url.startsWith("http") ? new HttpProvider(url) : new WsProvider(url, 2_500, {}, 120_000);
    api = ApiPromise.create({ provider, noInitWarn: true, throwOnConnect: false });
    api.catch(() => apis.delete(url));
    apis.set(url, api);
  }
  return api;
}

export async function disconnect(): Promise<void> {
  const all = [...apis.values()];
  apis.clear();
  await Promise.all(all.map(async (p) => (await p).disconnect().catch(() => {})));
}
