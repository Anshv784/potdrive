import { NETWORK } from "./network";

export class RpcError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
  }
}

let nextId = 1;

// Server-side override, used to run the gateway against a local fake node in tests.
const DEFAULT_URL = (typeof process !== "undefined" && process.env?.POTDRIVE_RPC_URL) || NETWORK.http;

// Plain JSON-RPC over HTTP. Works in browsers (the node sends CORS *), workers and Node.
export async function rpc<T>(method: string, params: unknown[] = [], url: string = DEFAULT_URL): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  if (!res.ok) throw new RpcError(`${method}: HTTP ${res.status}`, res.status);
  const body = (await res.json()) as { result?: T; error?: { code: number; message: string } };
  if (body.error) throw new RpcError(`${method}: ${body.error.message}`, body.error.code);
  return body.result as T;
}

export async function head(url?: string): Promise<number> {
  const h = await rpc<{ number: string }>("chain_getHeader", [], url);
  return parseInt(h.number, 16);
}

export async function finalizedHead(url?: string): Promise<number> {
  const hash = await rpc<string>("chain_getFinalizedHead", [], url);
  const h = await rpc<{ number: string }>("chain_getHeader", [hash], url);
  return parseInt(h.number, 16);
}
