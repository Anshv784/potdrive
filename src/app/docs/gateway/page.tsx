import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Gateway API" };

const routes: [string, string][] = [
  ["GET /ipfs/<cid>", "A file, verified. Raw leaves and UnixFS files."],
  ["GET /ipfs/<cid>/", "A directory: index.html if present, otherwise a listing."],
  ["GET /ipfs/<cid>/<path>", "A file inside a directory, resolved one verified block per segment."],
  ["?download=<name>", "Adds Content-Disposition: attachment."],
  ["?name=<name>", "Picks the Content-Type from the extension."],
  ["GET /api/file/<cid>", "JSON: format, every block's (block, index, size), expiry and registry record."],
  ["GET /api/stored", "JSON: every TransactionStorage entry and the public registry records."],
  ["GET /api/proofs", "JSON: recent blocks' storage proofs and the next due block."],
];

export default function Page() {
  return (
    <Doc href="/docs/gateway">
      <DocHeader
        eyebrow="Reference"
        title="Gateway API"
        summary="An IPFS-style HTTP gateway over Portaldot. Every byte it returns has been checked against its CID."
      />

      <H2 id="routes">Routes</H2>
      <table>
        <tbody>
          {routes.map(([r, d]) => (
            <tr key={r}>
              <td><code>{r}</code></td>
              <td>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2 id="range">Range requests</H2>
      <p>
        The gateway reads the UnixFS root&apos;s <code>blockSizes</code>, works out which leaves overlap the requested range, and
        fetches only those. A video can seek to minute 40 without downloading minutes 1 to 39. Responses over 32 MiB are served
        in windows with <code>206 Partial Content</code>. Browsers continue with further ranges on their own.
      </p>
      <Code
        lang="bash"
        title="Terminal"
        code={`$ curl -sI -H "Range: bytes=5000000-5000099" https://potdrive.anshverma.tech/ipfs/bafykbzace…
HTTP/2 206
content-range: bytes 5000000-5000099/16777216
accept-ranges: bytes
x-potdrive-verified: blake2b-256`}
      />

      <H2 id="headers">Response headers</H2>
      <table>
        <tbody>
          <tr><td><code>Content-Type</code></td><td>From <code>?name</code> or the path extension, then the registry, then the first bytes. Sealed files are always <code>application/octet-stream</code>.</td></tr>
          <tr><td><code>Content-Security-Policy</code></td><td><code>sandbox allow-scripts …</code> for HTML, SVG and JS. See <a href="/docs/websites#sandbox">the sandbox</a>.</td></tr>
          <tr><td><code>Cache-Control</code></td><td><code>public, max-age=31536000, immutable</code>. A CID never changes.</td></tr>
          <tr><td><code>ETag</code></td><td>The CID. <code>If-None-Match</code> gives <code>304</code>.</td></tr>
          <tr><td><code>Access-Control-Allow-Origin</code></td><td><code>*</code></td></tr>
          <tr><td><code>X-Ipfs-Path</code></td><td>The resolved path, as IPFS gateways send it.</td></tr>
        </tbody>
      </table>

      <H2 id="errors">Status codes</H2>
      <table>
        <tbody>
          <tr><td><code>400</code></td><td>Not a CIDv1 with a blake2b-256 multihash.</td></tr>
          <tr><td><code>404</code></td><td>Not held by Portaldot (never stored, or expired), or no such path.</td></tr>
          <tr><td><code>416</code></td><td>Range outside the file.</td></tr>
          <tr><td><code>502</code></td><td>The node returned bytes that do not match the CID. Refused.</td></tr>
          <tr><td><code>503</code></td><td>The Portaldot node did not answer.</td></tr>
        </tbody>
      </table>
    </Doc>
  );
}
